/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/*
  TODO: These tests are wildly imcomplete
  Need tests for spacing, etc
*/

const { evaluate, parse } = require('..');

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

  describe('Variables', () => {
    it('strings', () => {
      expect(parse('f')).toEqual('f');
      expect(parse('foo')).toEqual('foo');
    });

    it('allowed characters', () => {
      expect(parse('_foo')).toEqual('_foo');
      expect(parse('@foo')).toEqual('@foo');
      expect(parse('.foo')).toEqual('.foo');
      expect(parse('-foo')).toEqual('-foo');
      expect(parse('_foo0')).toEqual('_foo0');
      expect(parse('@foo0')).toEqual('@foo0');
      expect(parse('.foo0')).toEqual('.foo0');
      expect(parse('-foo0')).toEqual('-foo0');
    });
  });

  describe('quoted variables', () => {
    it('strings with double quotes', () => {
      expect(parse('"foo"')).toEqual('foo');
      expect(parse('"f b"')).toEqual('f b');
      expect(parse('"foo bar"')).toEqual('foo bar');
      expect(parse('"foo bar fizz buzz"')).toEqual('foo bar fizz buzz');
      expect(parse('"foo   bar   baby"')).toEqual('foo   bar   baby');
    });

    it('strings with single quotes', () => {
      /* eslint-disable prettier/prettier */
      expect(parse("'foo'")).toEqual('foo');
      expect(parse("'f b'")).toEqual('f b');
      expect(parse("'foo bar'")).toEqual('foo bar');
      expect(parse("'foo bar fizz buzz'")).toEqual('foo bar fizz buzz');
      expect(parse("'foo   bar   baby'")).toEqual('foo   bar   baby');
      /* eslint-enable prettier/prettier */
    });

    it('allowed characters', () => {
      expect(parse('"_foo bar"')).toEqual('_foo bar');
      expect(parse('"@foo bar"')).toEqual('@foo bar');
      expect(parse('".foo bar"')).toEqual('.foo bar');
      expect(parse('"-foo bar"')).toEqual('-foo bar');
      expect(parse('"_foo0 bar1"')).toEqual('_foo0 bar1');
      expect(parse('"@foo0 bar1"')).toEqual('@foo0 bar1');
      expect(parse('".foo0 bar1"')).toEqual('.foo0 bar1');
      expect(parse('"-foo0 bar1"')).toEqual('-foo0 bar1');
    });

    it('invalid characters in double quotes', () => {
      const check = (str) => () => parse(str);
      expect(check('" foo bar"')).toThrow('but "\\"" found');
      expect(check('"foo bar "')).toThrow('but "\\"" found');
      expect(check('"0foo"')).toThrow('but "\\"" found');
      expect(check('" foo bar"')).toThrow('but "\\"" found');
      expect(check('"foo bar "')).toThrow('but "\\"" found');
      expect(check('"0foo"')).toThrow('but "\\"" found');
    });

    it('invalid characters in single quotes', () => {
      const check = (str) => () => parse(str);
      /* eslint-disable prettier/prettier */
      expect(check("' foo bar'")).toThrow('but "\'" found');
      expect(check("'foo bar '")).toThrow('but "\'" found');
      expect(check("'0foo'")).toThrow('but "\'" found');
      expect(check("' foo bar'")).toThrow('but "\'" found');
      expect(check("'foo bar '")).toThrow('but "\'" found');
      expect(check("'0foo'")).toThrow('but "\'" found');
      /* eslint-enable prettier/prettier */
    });
  });

  describe('Functions', () => {
    it('no arguments', () => {
      expect(parse('foo()')).toEqual({ name: 'foo', args: [] });
    });

    it('arguments', () => {
      expect(parse('foo(5,10)')).toEqual({ name: 'foo', args: [5, 10] });
    });

    it('arguments with strings', () => {
      expect(parse('foo("string with spaces")')).toEqual({
        name: 'foo',
        args: ['string with spaces'],
      });

      /* eslint-disable prettier/prettier */
      expect(parse("foo('string with spaces')")).toEqual({
        name: 'foo',
        args: ['string with spaces'],
      });
      /* eslint-enable prettier/prettier */
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

  it('valiables with dots', () => {
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
