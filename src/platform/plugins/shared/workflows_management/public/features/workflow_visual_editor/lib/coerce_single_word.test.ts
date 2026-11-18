/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, stringify } from 'yaml';
import { coerceSingleWord } from './coerce_single_word';

const written = (value: unknown): string => stringify({ k: value }).trim();

describe('coerceSingleWord', () => {
  describe('booleans and null are read as YAML reads them', () => {
    it.each([
      ['true', true],
      ['True', true],
      ['TRUE', true],
      ['false', false],
      ['False', false],
      ['FALSE', false],
      ['null', null],
      ['Null', null],
      ['NULL', null],
      ['~', null],
    ])('%s', (word, expected) => {
      expect(coerceSingleWord(word)).toBe(expected);
    });
  });

  describe('numbers that write back as the same text are numbers', () => {
    it.each([
      ['0', 0],
      ['1', 1],
      ['-1', -1],
      ['42', 42],
      ['1.1', 1.1],
      ['-1.1', -1.1],
      ['0.5', 0.5],
      ['1000', 1000],
      ['9007199254740991', 9007199254740991],
    ])('%s', (word, expected) => {
      expect(coerceSingleWord(word)).toBe(expected);
    });
  });

  describe('numbers that would change when written back stay text', () => {
    it.each([
      '+1',
      '-0',
      '.5',
      '5.',
      '1.0',
      '1.10',
      '1e3',
      '1E3',
      '0x1F',
      '0o17',
      '007',
      '01',
      '00',
      '.inf',
      '-.inf',
      '.nan',
      '12345678901234567890',
      '9007199254740993',
    ])('%s', (word) => {
      expect(coerceSingleWord(word)).toBe(word);
    });
  });

  describe('single words that are not booleans, null or numbers stay text', () => {
    it.each([
      'undefined',
      'true_false',
      'truefalse',
      'trueish',
      'nullable',
      'yes',
      'no',
      'on',
      'off',
      'Yes',
      'NaN',
      'Infinity',
      '0b1',
      '1_000',
      '1N',
      '1n',
      '1.1.1',
      '1-1',
      'a:b',
      'a#b',
      'a,b',
      'a\\b',
      'user_name',
      '${{x}}',
    ])('%s', (word) => {
      expect(coerceSingleWord(word)).toBe(word);
    });
  });

  describe('what the parser reads as something else than a plain scalar stays text', () => {
    it.each([
      '{{x}}',
      '{a}',
      '[a]',
      '#c',
      '&a',
      '&a1',
      '*a',
      '!t',
      '!!str',
      '"q"',
      "'q'",
      '"true"',
      "'1'",
      '|',
      '>',
      'key:',
      '-',
      '?',
      '@x',
      '%x',
      '`x',
    ])('%s', (word) => {
      expect(coerceSingleWord(word)).toBe(word);
    });
  });

  describe('JSON lists and objects are lists and objects, spaces or not', () => {
    it.each([
      ['[]', []],
      ['{}', {}],
      ['[ ]', []],
      ['{ }', {}],
      ['[[]]', [[]]],
      ['[1,2]', [1, 2]],
      ['[1, 2]', [1, 2]],
      ['[\n  1,\n  2\n]', [1, 2]],
      ['["a","b"]', ['a', 'b']],
      ['["a", "b"]', ['a', 'b']],
      ['["Northstar SOC","scope:x"]', ['Northstar SOC', 'scope:x']],
      ['{"a":1}', { a: 1 }],
      ['{ "a": 1 }', { a: 1 }],
      ['{"a":{"b":[]}}', { a: { b: [] } }],
      ['[null,true,false,1.5,-2,0]', [null, true, false, 1.5, -2, 0]],
      ['["a\\"b"]', ['a"b']],
      ['["é"]', ['é']],
      ['{"a":"{{x}}"}', { a: '{{x}}' }],
      ['{"a":"{{ x }}"}', { a: '{{ x }}' }],
      ['{"a":"${{ steps.x.output }}"}', { a: '${{ steps.x.output }}' }],
      ['[{"foo":"bar"},{"hello":"world"}]', [{ foo: 'bar' }, { hello: 'world' }]],
    ])('%j', (text, expected) => {
      expect(coerceSingleWord(text)).toStrictEqual(expected);
    });
  });

  describe('what is not valid JSON, or would change when written back, stays text', () => {
    it.each([
      '{{x}}',
      '{{ x }}',
      '{{ x.y }}',
      '{%x%}',
      '{% if a %}',
      '[a]',
      '[a, b]',
      '{a}',
      '{a: 1}',
      "['a']",
      '[',
      '{',
      ']',
      '}',
      '[}',
      '{]',
      '[1,]',
      '[,]',
      '{"a"}',
      '{"a":1,}',
      '[1 2]',
      '[1.0]',
      '[ 1.0 ]',
      '[1e3]',
      '[-0]',
      '[12345678901234567890]',
      '{"a":1,"a":2}',
      '{"b":1,"1":2}',
      '["\\u00e9"]',
      '[] ',
      ' []',
      '[]x',
      'x[]',
      '[] []',
      '[1] [2]',
      '"[]"',
      "'[]'",
      '${{ [] }}',
    ])('%j', (text) => {
      expect(coerceSingleWord(text)).toBe(text);
    });
  });

  describe('text with a space, or no text, is never changed', () => {
    it.each(['true false', ' true', 'true ', '1 ', ' 1', 'null\t', 'a b', '1 2', '\ttrue', ''])(
      '%j',
      (text) => {
        expect(coerceSingleWord(text)).toBe(text);
      }
    );
  });

  describe('what is written for the result', () => {
    it.each([
      ['true', 'k: true'],
      ['false', 'k: false'],
      ['null', 'k: null'],
      ['~', 'k: null'],
      ['1', 'k: 1'],
      ['0', 'k: 0'],
      ['-1', 'k: -1'],
      ['1.1', 'k: 1.1'],
      ['-1.1', 'k: -1.1'],
      ['true_false', 'k: true_false'],
      ['undefined', 'k: undefined'],
      ['1N', 'k: 1N'],
      ['yes', 'k: yes'],
      ['true false', 'k: true false'],
      ['[]', 'k: []'],
      ['{}', 'k: {}'],
      ['["a","b"]', 'k:\n  - a\n  - b'],
      ['{"a":1}', 'k:\n  a: 1'],
      ['[a]', 'k: "[a]"'],
      ['[1.0]', 'k: "[1.0]"'],
      ['007', 'k: "007"'],
      ['1.10', 'k: "1.10"'],
      ['1e3', 'k: "1e3"'],
      ['{{x}}', 'k: "{{x}}"'],
    ])('%s is written as %s', (word, expected) => {
      expect(written(coerceSingleWord(word))).toBe(expected);
    });

    it.each([
      'true',
      'False',
      'null',
      '~',
      '0',
      '-1',
      '1.1',
      '-1.1',
      '1N',
      'undefined',
      'true_false',
      'true false',
      '007',
      '1.10',
      '1e3',
      '12345678901234567890',
      '{{x}}',
      '[a]',
      '[]',
      '{}',
      '[ ]',
      '["a b"]',
      '[1, 2]',
      '{"a":[1,{"b":null}]}',
      '[1.0]',
      '#c',
      '&a',
      '*a',
      '"q"',
      '|',
      '${{x}}',
      '${{ steps.a.output }}',
    ])('%s survives being written and read back', (word) => {
      const result = coerceSingleWord(word);
      expect(parse(written(result)).k).toStrictEqual(result);
    });
  });
});
