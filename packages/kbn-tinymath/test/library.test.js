/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
  TODO: These tests are wildly imcomplete
  Need tests for spacing, etc
*/

import { evaluate, parse } from '../src';

function variableEqual(value) {
  return expect.objectContaining({ type: 'variable', value });
}

function functionEqual(name, args) {
  return expect.objectContaining({ type: 'function', name, args });
}

function namedArgumentEqual(name, value) {
  return expect.objectContaining({ type: 'namedArgument', name, value });
}

describe('Parser', () => {
  describe('Numbers', () => {
    it('integers', () => {
      expect(parse('10')).toEqual(10);
    });

    it('floats', () => {
      expect(parse('10.5')).toEqual(10.5);
    });

    it('negatives', () => {
      expect(parse('-10')).toEqual(-10);
      expect(parse('-10.5')).toEqual(-10.5);
    });
  });

  describe('Math', () => {
    it('converts basic symbols into left-to-right pairs', () => {
      expect(parse('a + b + c - d')).toEqual({
        args: [
          {
            name: 'add',
            type: 'function',
            args: [
              {
                name: 'add',
                type: 'function',
                args: [
                  expect.objectContaining({ location: { min: 0, max: 2 } }),
                  expect.objectContaining({ location: { min: 3, max: 6 } }),
                ],
              },
              expect.objectContaining({ location: { min: 7, max: 10 } }),
            ],
          },
          expect.objectContaining({ location: { min: 11, max: 13 } }),
        ],
        name: 'subtract',
        type: 'function',
        text: 'a + b + c - d',
        location: { min: 0, max: 13 },
      });
    });

    describe('Comparison', () => {
      it('should throw for non valid comparison symbols', () => {
        const symbols = ['<>', '><', '===', '>>', '<<'];
        for (const symbol of symbols) {
          expect(() => parse(`5 ${symbol} 1`)).toThrow();
        }
      });
      describe.each`
        symbol  | fn
        ${'<'}  | ${'lt'}
        ${'>'}  | ${'gt'}
        ${'=='} | ${'eq'}
        ${'>='} | ${'gte'}
        ${'<='} | ${'lte'}
      `('Symbol "$symbol" ( $fn )', ({ symbol, fn }) => {
        it(`should parse comparison symbol: "$symbol"`, () => {
          expect(parse(`5 ${symbol} 1`)).toEqual({
            name: fn,
            type: 'function',
            args: [5, 1],
            text: `5 ${symbol} 1`,
            location: { min: 0, max: 4 + symbol.length },
          });
          expect(parse(`a ${symbol} b`)).toEqual({
            name: fn,
            type: 'function',
            args: [variableEqual('a'), variableEqual('b')],
            text: `a ${symbol} b`,
            location: { min: 0, max: 4 + symbol.length },
          });
        });

        it.each`
          expression
          ${`1 + (1 ${symbol} 1)`}
          ${`(1 ${symbol} 1) + 1`}
          ${`((1 ${symbol} 1) + 1)`}
          ${`((1 ${symbol} 1) + (1 ${symbol} 1))`}
          ${`((1 ${symbol} 1) + ( ${symbol} 1))`}
          ${` ${symbol} 1`}
          ${`1 ${symbol} `}
          ${`a + (b ${symbol} c)`}
          ${`(a ${symbol} b) + c`}
          ${`((a ${symbol} b) + c)`}
          ${`((a ${symbol} b) + (c ${symbol} d))`}
          ${`((a ${symbol} b) + ( ${symbol} c))`}
          ${` ${symbol} a`}
          ${`a ${symbol} `}
        `(
          'should throw for invalid expression with comparison arguments: $expression',
          ({ expression }) => {
            expect(() => parse(expression)).toThrow();
          }
        );

        it.each`
          expression
          ${`1 ${symbol} 1 ${symbol} 1`}
          ${`(1 ${symbol} 1) ${symbol} 1`}
          ${`1 ${symbol} (1 ${symbol} 1)`}
          ${`a ${symbol} b ${symbol} c`}
          ${`(a ${symbol} b) ${symbol} c`}
          ${`a ${symbol} (b ${symbol} c)`}
        `('should throw for cascading comparison operators: $expression', ({ expression }) => {
          expect(() => parse(expression)).toThrow();
        });

        it.each`
          expression
          ${`1 ${symbol} 1`}
          ${`(1 ${symbol} 1)`}
          ${`((1 ${symbol} 1))`}
          ${`((1 + 1) ${symbol} 1)`}
          ${`1 + 1 ${symbol} 1 * 1`}
          ${`a ${symbol} b`}
          ${`(a ${symbol} b)`}
          ${`((a ${symbol} b))`}
          ${`((a + b) ${symbol} c)`}
          ${`a + b ${symbol} c * d`}
        `('should parse comparison expressions: $expression', ({ expression }) => {
          expect(() => parse(expression)).not.toThrow();
        });
      });
    });
  });

  describe('Variables', () => {
    it('strings', () => {
      expect(parse('f')).toEqual(variableEqual('f'));
      expect(parse('foo')).toEqual(variableEqual('foo'));
      expect(parse('foo1')).toEqual(variableEqual('foo1'));
      expect(() => parse('1foo1')).toThrow('but "f" found');
    });

    it('strings with spaces', () => {
      expect(parse(' foo ')).toEqual(variableEqual('foo'));
      expect(() => parse(' foo bar ')).toThrow('but "b" found');
    });

    it('allowed characters', () => {
      expect(parse('_foo')).toEqual(variableEqual('_foo'));
      expect(parse('@foo')).toEqual(variableEqual('@foo'));
      expect(parse('.foo')).toEqual(variableEqual('.foo'));
      expect(parse('-foo')).toEqual(variableEqual('-foo'));
      expect(parse('_foo0')).toEqual(variableEqual('_foo0'));
      expect(parse('@foo0')).toEqual(variableEqual('@foo0'));
      expect(parse('.foo0')).toEqual(variableEqual('.foo0'));
      expect(parse('-foo0')).toEqual(variableEqual('-foo0'));
      expect(() => parse(`foo😀\t')`)).toThrow('Failed to parse');
    });
  });

  describe('quoted variables', () => {
    it('strings with double quotes', () => {
      expect(parse('"foo"')).toEqual(variableEqual('foo'));
      expect(parse('"f b"')).toEqual(variableEqual('f b'));
      expect(parse('"foo bar"')).toEqual(variableEqual('foo bar'));
      expect(parse('"foo bar fizz buzz"')).toEqual(variableEqual('foo bar fizz buzz'));
      expect(parse('"foo   bar   baby"')).toEqual(variableEqual('foo   bar   baby'));
      expect(parse(`"f'oo"`)).toEqual(variableEqual(`f'oo`));
      expect(parse(`"foo😀\t"`)).toEqual(variableEqual(`foo😀\t`));
    });

    it('strings with single quotes', () => {
      /* eslint-disable prettier/prettier */
      expect(parse("'foo'")).toEqual(variableEqual('foo'));
      expect(parse("'f b'")).toEqual(variableEqual('f b'));
      expect(parse("'foo bar'")).toEqual(variableEqual('foo bar'));
      expect(parse("'foo bar fizz buzz'")).toEqual(variableEqual('foo bar fizz buzz'));
      expect(parse("'foo   bar   baby'")).toEqual(variableEqual('foo   bar   baby'));
      expect(parse("' foo bar'")).toEqual(variableEqual(" foo bar"));
      expect(parse("'foo bar '")).toEqual(variableEqual("foo bar "));
      expect(parse("'0foo'")).toEqual(variableEqual("0foo"));
      expect(parse("' foo bar'")).toEqual(variableEqual(" foo bar"));
      expect(parse("'foo bar '")).toEqual(variableEqual("foo bar "));
      expect(parse("'0foo'")).toEqual(variableEqual("0foo"));
      expect(parse(`'f"oo'`)).toEqual(variableEqual(`f"oo`));
      expect(parse(`'foo😀\t'`)).toEqual(variableEqual(`foo😀\t`));
      /* eslint-enable prettier/prettier */
    });

    it('allowed characters', () => {
      expect(parse('"_foo bar"')).toEqual(variableEqual('_foo bar'));
      expect(parse('"@foo bar"')).toEqual(variableEqual('@foo bar'));
      expect(parse('".foo bar"')).toEqual(variableEqual('.foo bar'));
      expect(parse('"-foo bar"')).toEqual(variableEqual('-foo bar'));
      expect(parse('"_foo0 bar1"')).toEqual(variableEqual('_foo0 bar1'));
      expect(parse('"@foo0 bar1"')).toEqual(variableEqual('@foo0 bar1'));
      expect(parse('".foo0 bar1"')).toEqual(variableEqual('.foo0 bar1'));
      expect(parse('"-foo0 bar1"')).toEqual(variableEqual('-foo0 bar1'));
      expect(parse('" foo bar"')).toEqual(variableEqual(' foo bar'));
      expect(parse('"foo bar "')).toEqual(variableEqual('foo bar '));
      expect(parse('"0foo"')).toEqual(variableEqual('0foo'));
      expect(parse('" foo bar"')).toEqual(variableEqual(' foo bar'));
      expect(parse('"foo bar "')).toEqual(variableEqual('foo bar '));
      expect(parse('"0foo"')).toEqual(variableEqual('0foo'));
    });
  });

  describe('Functions', () => {
    it('no arguments', () => {
      expect(parse('foo()')).toEqual(functionEqual('foo', []));
    });

    it('arguments', () => {
      expect(parse('foo(5,10)')).toEqual(functionEqual('foo', [5, 10]));
    });

    it('arguments with strings', () => {
      expect(parse('foo("string with spaces")')).toEqual(
        functionEqual('foo', [variableEqual('string with spaces')])
      );

      expect(parse("foo('string with spaces')")).toEqual(
        functionEqual('foo', [variableEqual('string with spaces')])
      );
    });

    it('named only', () => {
      expect(parse('foo(q=10)')).toEqual(functionEqual('foo', [namedArgumentEqual('q', 10)]));
    });

    it('named argument is numeric', () => {
      expect(parse('foo(q=10.1234e5)')).toEqual(
        functionEqual('foo', [namedArgumentEqual('q', 10.1234e5)])
      );
    });

    it('named argument is empty string', () => {
      expect(parse('foo(q="")')).toEqual(functionEqual('foo', [namedArgumentEqual('q', '')]));
      expect(parse(`foo(q='')`)).toEqual(functionEqual('foo', [namedArgumentEqual('q', '')]));
    });

    it('named and positional', () => {
      expect(parse('foo(ref, q="bar")')).toEqual(
        functionEqual('foo', [variableEqual('ref'), namedArgumentEqual('q', 'bar')])
      );
      expect(parse(`foo(ref, q='ba"r')`)).toEqual(
        functionEqual('foo', [variableEqual('ref'), namedArgumentEqual('q', `ba"r`)])
      );
    });

    it('numerically named', () => {
      expect(() => parse('foo(1=2)')).toThrow('but "(" found');
    });

    it('multiple named', () => {
      expect(parse('foo(q_param="bar", offset="1d")')).toEqual(
        functionEqual('foo', [
          namedArgumentEqual('q_param', 'bar'),
          namedArgumentEqual('offset', '1d'),
        ])
      );
    });

    it('multiple named and positional', () => {
      expect(parse('foo(q="bar", ref, offset="1d", 100)')).toEqual(
        functionEqual('foo', [
          namedArgumentEqual('q', 'bar'),
          variableEqual('ref'),
          namedArgumentEqual('offset', '1d'),
          100,
        ])
      );
    });

    it('duplicate named', () => {
      expect(parse('foo(q="bar", q="test")')).toEqual(
        functionEqual('foo', [namedArgumentEqual('q', 'bar'), namedArgumentEqual('q', 'test')])
      );
    });

    it('incomplete named', () => {
      expect(() => parse('foo(a=)')).toThrow('but "(" found');
      expect(() => parse('foo(=a)')).toThrow('but "(" found');
    });

    it('invalid named', () => {
      expect(() => parse('foo(offset-type="1d")')).toThrow('but "(" found');
    });

    it('named with complex strings', () => {
      expect(parse(`foo(filter='😀 > "\ttab"')`)).toEqual(
        functionEqual('foo', [namedArgumentEqual('filter', `😀 > "\ttab"`)])
      );
    });

    it('named with escape characters', () => {
      expect(parse(`foo(filter='Women\\'s Clothing')`)).toEqual(
        functionEqual('foo', [namedArgumentEqual('filter', `Women's Clothing`)])
      );
      expect(parse(`foo(filter="\\"Quoted inner string\\"")`)).toEqual(
        functionEqual('foo', [namedArgumentEqual('filter', `"Quoted inner string"`)])
      );
    });
  });

  it('Missing expression', () => {
    expect(() => parse(undefined)).toThrow('Missing expression');
    expect(() => parse(null)).toThrow('Missing expression');
  });

  it('Failed parse', () => {
    expect(() => parse('')).toThrow('Failed to parse expression');
  });

  it('Not a string', () => {
    expect(() => parse(3)).toThrow('Expression must be a string');
  });
});

describe('Evaluate', () => {
  it('numbers', () => {
    expect(evaluate('10')).toEqual(10);
  });

  it('variables', () => {
    expect(evaluate('foo', { foo: 10 })).toEqual(10);
    expect(evaluate('bar', { bar: [1, 2] })).toEqual([1, 2]);
  });

  it('variables with spaces', () => {
    expect(evaluate('"foo bar"', { 'foo bar': 10 })).toEqual(10);
    expect(evaluate('"key with many spaces in it"', { 'key with many spaces in it': 10 })).toEqual(
      10
    );
  });

  it('variables with dots', () => {
    expect(evaluate('foo.bar', { 'foo.bar': 20 })).toEqual(20);
    expect(evaluate('"is.null"', { 'is.null': null })).toEqual(null);
    expect(evaluate('"is.false"', { 'is.null': null, 'is.false': false })).toEqual(false);
    expect(evaluate('"with space.val"', { 'with space.val': 42 })).toEqual(42);
  });

  it('variables with dot notation', () => {
    expect(evaluate('foo.bar', { foo: { bar: 20 } })).toEqual(20);
    expect(evaluate('foo.bar[0].baz', { foo: { bar: [{ baz: 30 }, { beer: 40 }] } })).toEqual(30);
    expect(evaluate('"is.false"', { is: { null: null, false: false } })).toEqual(false);
  });

  it('equations', () => {
    expect(evaluate('3 + 4')).toEqual(7);
    expect(evaluate('10 - 2')).toEqual(8);
    expect(evaluate('8 + 6 / 3')).toEqual(10);
    expect(evaluate('10 * (1 + 2)')).toEqual(30);
    expect(evaluate('(3 - 4) * 10')).toEqual(-10);
    expect(evaluate('-1 - -12')).toEqual(11);
    expect(evaluate('5/20')).toEqual(0.25);
    expect(evaluate('1 + 1 + 2 + 3 + 12')).toEqual(19);
    expect(evaluate('100 / 10 / 10')).toEqual(1);
    expect(evaluate('0 * 1 - 100 / 10 / 10')).toEqual(-1);
    expect(evaluate('100 / (10 / 10)')).toEqual(100);
  });

  it('equations with functions', () => {
    expect(evaluate('3 + multiply(10, 4)')).toEqual(43);
    expect(evaluate('3 + multiply(10, 4, 5)')).toEqual(203);
  });

  it('equations with trigonometry', () => {
    expect(evaluate('pi()')).toEqual(Math.PI);
    expect(evaluate('sin(degtorad(0))')).toEqual(0);
    expect(evaluate('sin(degtorad(180))')).toEqual(1.2246467991473532e-16);
    expect(evaluate('cos(degtorad(0))')).toEqual(1);
    expect(evaluate('cos(degtorad(180))')).toEqual(-1);
    expect(evaluate('tan(degtorad(0))')).toEqual(0);
    expect(evaluate('tan(degtorad(180))')).toEqual(-1.2246467991473532e-16);
  });

  it('equations with variables', () => {
    expect(evaluate('3 + foo', { foo: 5 })).toEqual(8);
    expect(evaluate('3 + foo', { foo: [5, 10] })).toEqual([8, 13]);
    expect(evaluate('3 + foo', { foo: 5 })).toEqual(8);
    expect(evaluate('sum(foo)', { foo: [5, 10, 15] })).toEqual(30);
    expect(evaluate('90 / sum(foo)', { foo: [5, 10, 15] })).toEqual(3);
    expect(evaluate('multiply(foo, bar)', { foo: [1, 2, 3], bar: [4, 5, 6] })).toEqual([4, 10, 18]);
  });

  it('equations with quoted variables', () => {
    expect(evaluate('"b" * 7', { b: 3 })).toEqual(21);
    expect(evaluate('"space name" * 2', { 'space name': [1, 2, 21] })).toEqual([2, 4, 42]);
    expect(evaluate('sum("space name")', { 'space name': [1, 2, 21] })).toEqual(24);
  });

  it('throws on named arguments', () => {
    expect(() => evaluate('sum(invalid=a)')).toThrow('Named arguments are not supported');
  });

  it('equations with injected functions', () => {
    expect(
      evaluate(
        'plustwo(foo)',
        { foo: 5 },
        {
          plustwo: function (a) {
            return a + 2;
          },
        }
      )
    ).toEqual(7);
    expect(
      evaluate('negate(1)', null, {
        negate: function (a) {
          return -a;
        },
      })
    ).toEqual(-1);
    expect(
      evaluate('stringify(2)', null, {
        stringify: function (a) {
          return '' + a;
        },
      })
    ).toEqual('2');
  });

  it('equations with arrays using special operator functions', () => {
    expect(evaluate('foo + bar', { foo: [1, 2, 3], bar: [4, 5, 6] })).toEqual([5, 7, 9]);
    expect(evaluate('foo - bar', { foo: [1, 2, 3], bar: [4, 5, 6] })).toEqual([-3, -3, -3]);
    expect(evaluate('foo * bar', { foo: [1, 2, 3], bar: [4, 5, 6] })).toEqual([4, 10, 18]);
    expect(evaluate('foo / bar', { foo: [1, 2, 3], bar: [4, 5, 6] })).toEqual([
      1 / 4,
      2 / 5,
      3 / 6,
    ]);
  });

  it('missing expression', () => {
    expect(() => evaluate('')).toThrow('Failed to parse expression');
  });

  it('missing referenced scope when used in injected function', () => {
    expect(() =>
      evaluate('increment(foo)', null, {
        increment: function (a) {
          return a + 1;
        },
      })
    ).toThrow('Unknown variable: foo');
  });

  it('invalid context datatypes', () => {
    expect(evaluate('mean(foo)', { foo: [true, true, false] })).toBeNaN();
    expect(evaluate('mean(foo + bar)', { foo: [true, true, false], bar: [1, 2, 3] })).toBeNaN();
    expect(evaluate('mean(foo)', { foo: ['dog', 'cat', 'mouse'] })).toBeNaN();
    expect(evaluate('mean(foo + 2)', { foo: ['dog', 'cat', 'mouse'] })).toBeNaN();
    expect(evaluate('foo + bar', { foo: NaN, bar: [4, 5, 6] })).toBeNaN();
  });
});
