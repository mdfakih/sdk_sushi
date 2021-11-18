import {
  ChainId,
  ChainKey,
  CurrencyAmount,
  InsufficientInputAmountError,
  Price,
  Token,
  USDC_ADDRESS,
  WETH9,
  WETH9_ADDRESS,
} from '@sushiswap/core-sdk'

import { ConstantProductPool } from '../../src/entities'
import all from '@sushiswap/trident/exports/all.json'
import { computeConstantProductPoolAddress } from '../../src/functions'

describe('computePoolAddress', () => {
  it('should correctly compute the pool address', () => {
    const tokenA = new Token(ChainId.KOVAN, USDC_ADDRESS[ChainId.KOVAN], 6, 'USDC', 'USD Coin')
    const tokenB = new Token(ChainId.KOVAN, WETH9_ADDRESS[ChainId.KOVAN], 18, 'WETH', 'Wrapped Ether')

    expect(tokenA.address).toEqual('0xb7a4F3E9097C08dA09517b5aB877F7a917224ede')
    expect(tokenB.address).toEqual('0xd0A1E359811322d97991E03f863a0C30C2cF029C')

    const fee = 30

    const twap = true

    // console.log({
    //   constantProductFactoryAddress: all[ChainId.KOVAN][ChainKey.KOVAN].contracts.ConstantProductPoolFactory.address,
    //   masterDeployerAddress: all[ChainId.KOVAN][ChainKey.KOVAN].contracts.MasterDeployer.address,
    //   tokens: [tokenA.address, tokenB.address].sort(),
    //   fee,
    //   twap,
    // })

    const address = computeConstantProductPoolAddress({
      factoryAddress: all[ChainId.KOVAN][ChainKey.KOVAN].contracts.ConstantProductPoolFactory.address,
      tokenA,
      tokenB,
      fee,
      twap,
    })

    // console.log({
    //   tokenA: tokenA.symbol,
    //   tokenB: tokenB.symbol,
    //   address,
    // })

    expect(address).toEqual('0x04A7B1D08228C284442d34d72c16bA1CBA7C462A')
  })
})

describe('ConstantProductPool', () => {
  const USDC = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
  const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')

  describe('constructor', () => {
    it('cannot be used for tokens on different chains', () => {
      expect(
        () =>
          new ConstantProductPool(
            CurrencyAmount.fromRawAmount(USDC, '100'),
            CurrencyAmount.fromRawAmount(WETH9[3], '100')
          )
      ).toThrow('CHAIN_IDS')
    })
  })

  describe('#getAddress', () => {
    it('returns the correct address', () => {
      expect(ConstantProductPool.getAddress(USDC, DAI)).toEqual('0x1ceb0D21f15e2f8c883856f2066CbCFFDd85217E')
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100'))
          .token0
      ).toEqual(DAI)
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100'))
          .token0
      ).toEqual(DAI)
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100'))
          .token1
      ).toEqual(USDC)
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100'))
          .token1
      ).toEqual(USDC)
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '101'))
          .reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(DAI, '101'))
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100'))
          .reserve0
      ).toEqual(CurrencyAmount.fromRawAmount(DAI, '101'))
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '101'))
          .reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '101'), CurrencyAmount.fromRawAmount(USDC, '100'))
          .reserve1
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
    })
  })

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '101'), CurrencyAmount.fromRawAmount(DAI, '100'))
          .token0Price
      ).toEqual(new Price(DAI, USDC, '100', '101'))
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '101'))
          .token0Price
      ).toEqual(new Price(DAI, USDC, '100', '101'))
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '101'), CurrencyAmount.fromRawAmount(DAI, '100'))
          .token1Price
      ).toEqual(new Price(USDC, DAI, '101', '100'))
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '101'))
          .token1Price
      ).toEqual(new Price(USDC, DAI, '101', '100'))
    })
  })

  describe('#priceOf', () => {
    const pair = new ConstantProductPool(
      CurrencyAmount.fromRawAmount(USDC, '101'),
      CurrencyAmount.fromRawAmount(DAI, '100')
    )
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(DAI)).toEqual(pair.token0Price)
      expect(pair.priceOf(USDC)).toEqual(pair.token1Price)
    })

    it('throws if invalid token', () => {
      expect(() => pair.priceOf(WETH9[1])).toThrow('TOKEN')
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(
        new ConstantProductPool(
          CurrencyAmount.fromRawAmount(USDC, '100'),
          CurrencyAmount.fromRawAmount(DAI, '101')
        ).reserveOf(USDC)
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
      expect(
        new ConstantProductPool(
          CurrencyAmount.fromRawAmount(DAI, '101'),
          CurrencyAmount.fromRawAmount(USDC, '100')
        ).reserveOf(USDC)
      ).toEqual(CurrencyAmount.fromRawAmount(USDC, '100'))
    })

    it('throws if not in the pair', () => {
      expect(() =>
        new ConstantProductPool(
          CurrencyAmount.fromRawAmount(DAI, '101'),
          CurrencyAmount.fromRawAmount(USDC, '100')
        ).reserveOf(WETH9[1])
      ).toThrow('TOKEN')
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(USDC, '100'), CurrencyAmount.fromRawAmount(DAI, '100'))
          .chainId
      ).toEqual(1)
      expect(
        new ConstantProductPool(CurrencyAmount.fromRawAmount(DAI, '100'), CurrencyAmount.fromRawAmount(USDC, '100'))
          .chainId
      ).toEqual(1)
    })
  })
  describe('#involvesToken', () => {
    expect(
      new ConstantProductPool(
        CurrencyAmount.fromRawAmount(USDC, '100'),
        CurrencyAmount.fromRawAmount(DAI, '100')
      ).involvesToken(USDC)
    ).toEqual(true)
    expect(
      new ConstantProductPool(
        CurrencyAmount.fromRawAmount(USDC, '100'),
        CurrencyAmount.fromRawAmount(DAI, '100')
      ).involvesToken(DAI)
    ).toEqual(true)
    expect(
      new ConstantProductPool(
        CurrencyAmount.fromRawAmount(USDC, '100'),
        CurrencyAmount.fromRawAmount(DAI, '100')
      ).involvesToken(WETH9[1])
    ).toEqual(false)
  })
  describe('miscellaneous', () => {
    it('getLiquidityMinted:0', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pool = new ConstantProductPool(
        CurrencyAmount.fromRawAmount(tokenA, '0'),
        CurrencyAmount.fromRawAmount(tokenB, '0')
      )

      expect(() => {
        pool.getLiquidityMinted(
          CurrencyAmount.fromRawAmount(pool.liquidityToken, '0'),
          CurrencyAmount.fromRawAmount(tokenA, '1000'),
          CurrencyAmount.fromRawAmount(tokenB, '1000')
        )
      }).toThrow(InsufficientInputAmountError)

      expect(() => {
        pool.getLiquidityMinted(
          CurrencyAmount.fromRawAmount(pool.liquidityToken, '0'),
          CurrencyAmount.fromRawAmount(tokenA, '1000000'),
          CurrencyAmount.fromRawAmount(tokenB, '1')
        )
      }).toThrow(InsufficientInputAmountError)

      const liquidity = pool.getLiquidityMinted(
        CurrencyAmount.fromRawAmount(pool.liquidityToken, '0'),
        CurrencyAmount.fromRawAmount(tokenA, '1001'),
        CurrencyAmount.fromRawAmount(tokenB, '1001')
      )

      expect(liquidity.quotient.toString()).toEqual('1')
    })

    it('getLiquidityMinted dai/weth', async () => {
      // const tokenA = DAI[ChainId.KOVAN]
      // const tokenB = WETH9[ChainId.KOVAN]

      const tokenA = new Token(ChainId.KOVAN, '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', 18, 'DAI', 'DAI Stablecoin')
      const tokenB = new Token(ChainId.KOVAN, '0xd0A1E359811322d97991E03f863a0C30C2cF029C', 18, 'WETH', 'Wrapped Ether')

      const pool = new ConstantProductPool(
        // CurrencyAmount.fromRawAmount(tokenB, '32009705094632063941'),
        // CurrencyAmount.fromRawAmount(tokenA, '428510510388'),
        CurrencyAmount.fromRawAmount(tokenA, '9705094632063941'),
        CurrencyAmount.fromRawAmount(tokenB, '1409090645367953')
      )

      expect(
        pool
          .getLiquidityMinted(
            CurrencyAmount.fromRawAmount(pool.liquidityToken, '3696544951575847'),
            CurrencyAmount.fromRawAmount(tokenA, '25000000000000000000'),
            CurrencyAmount.fromRawAmount(tokenB, '909090738947067')
          )
          .quotient.toString()
      ).toEqual('83927339236905609')
    })

    it('getLiquidityMinted:!0', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pool = new ConstantProductPool(
        CurrencyAmount.fromRawAmount(tokenA, '10000'),
        CurrencyAmount.fromRawAmount(tokenB, '10000')
      )

      expect(
        pool
          .getLiquidityMinted(
            CurrencyAmount.fromRawAmount(pool.liquidityToken, '10000'),
            CurrencyAmount.fromRawAmount(tokenA, '2000'),
            CurrencyAmount.fromRawAmount(tokenB, '2000')
          )
          .quotient.toString()
      ).toEqual('2000')

      // const tokenC = new Token(3, '0x0000000000000000000000000000000000000001', 6)
      // const tokenD = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      // const pool2 = new ConstantProductPool(
      //   CurrencyAmount.fromRawAmount(tokenC, '18877425'),
      //   CurrencyAmount.fromRawAmount(tokenD, '1553748331383265154')
      // )
      //
      // expect(
      //   pool2
      //     .getLiquidityMinted(
      //       CurrencyAmount.fromRawAmount(pool2.liquidityToken, '5295740579331'),
      //       CurrencyAmount.fromRawAmount(tokenA, '5000000'),
      //       CurrencyAmount.fromRawAmount(tokenB, '90909073894706722')
      //     )
      //     .quotient.toString()
      // ).toEqual('830997285723')
    })

    it('getLiquidityValue', async () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 18)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new ConstantProductPool(
        CurrencyAmount.fromRawAmount(tokenA, '1000'),
        CurrencyAmount.fromRawAmount(tokenB, '1000')
      )

      {
        const liquidityValue = pair.getLiquidityValue(
          tokenA,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000')
        )
        expect(liquidityValue.currency.equals(tokenA)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('1000')
      }

      // 500
      {
        const liquidityValue = pair.getLiquidityValue(
          tokenA,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '500')
        )
        expect(liquidityValue.currency.equals(tokenA)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('500')
      }

      // tokenB
      {
        const liquidityValue = pair.getLiquidityValue(
          tokenB,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000')
        )
        expect(liquidityValue.currency.equals(tokenB)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('1000')
      }
    })

    it('getLiquidityValueSingleToken', () => {
      const tokenA = new Token(3, '0x0000000000000000000000000000000000000001', 6)
      const tokenB = new Token(3, '0x0000000000000000000000000000000000000002', 18)
      const pair = new ConstantProductPool(
        CurrencyAmount.fromRawAmount(tokenA, '1000'),
        CurrencyAmount.fromRawAmount(tokenB, '1000')
      )

      {
        const liquidityValue = pair.getLiquidityValueSingleToken(
          tokenB,
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '1000'),
          CurrencyAmount.fromRawAmount(pair.liquidityToken, '500')
        )
        expect(liquidityValue.currency.equals(tokenB)).toBe(true)
        expect(liquidityValue.quotient.toString()).toBe('749')
      }

      // const pair = new ConstantProductPool(
      //   CurrencyAmount.fromRawAmount(tokenA, '18877425'),
      //   CurrencyAmount.fromRawAmount(tokenB, '1553748331383265154')
      // )

      // {
      //   const liquidityValue = pair.getLiquidityValueSingleToken(
      //     tokenA,
      //     CurrencyAmount.fromRawAmount(pair.liquidityToken, '5295740579331'),
      //     CurrencyAmount.fromRawAmount(pair.liquidityToken, '1003705801313')
      //   )
      //   expect(liquidityValue.currency.equals(tokenA)).toBe(true)
      //   expect(liquidityValue.quotient.toString()).toBe('6470535')
      // }
    })
  })
})
