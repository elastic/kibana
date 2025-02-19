/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import { getBracketsToClose, getExpressionType, shouldBeQuotedSource } from './helpers';
import { SupportedDataType } from '../definitions/types';
import { setTestFunctions } from './test_functions';

describe('shouldBeQuotedSource', () => {
  it('does not have to be quoted for sources with acceptable characters @-+$', () => {
    expect(shouldBeQuotedSource('foo')).toBe(false);
    expect(shouldBeQuotedSource('123-test@foo_bar+baz1')).toBe(false);
    expect(shouldBeQuotedSource('my-index*')).toBe(false);
    expect(shouldBeQuotedSource('my-index$')).toBe(false);
    expect(shouldBeQuotedSource('.my-index$')).toBe(false);
  });
  it(`should be quoted if containing any of special characters [:"=|,[\]/ \t\r\n]`, () => {
    expect(shouldBeQuotedSource('foo\ttest')).toBe(true);
    expect(shouldBeQuotedSource('foo\rtest')).toBe(true);
    expect(shouldBeQuotedSource('foo\ntest')).toBe(true);
    expect(shouldBeQuotedSource('foo:test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo|test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo[test]=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo/test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo,test-*,abc')).toBe(true);
    expect(shouldBeQuotedSource('foo, test-*, abc, xyz')).toBe(true);
    expect(shouldBeQuotedSource('foo, test-*, abc, xyz,test123')).toBe(true);
    expect(shouldBeQuotedSource('foo,test,xyz')).toBe(true);
    expect(
      shouldBeQuotedSource('<logstash-{now/M{yyyy.MM}}>,<logstash-{now/d{yyyy.MM.dd|+12:00}}>')
    ).toBe(true);
    expect(shouldBeQuotedSource('`backtick`,``multiple`back``ticks```')).toBe(true);
    expect(shouldBeQuotedSource('test,metadata,metaata,.metadata')).toBe(true);
    expect(shouldBeQuotedSource('cluster:index')).toBe(true);
    expect(shouldBeQuotedSource('cluster:index|pattern')).toBe(true);
    expect(shouldBeQuotedSource('cluster:.index')).toBe(true);
    expect(shouldBeQuotedSource('cluster*:index*')).toBe(true);
    expect(shouldBeQuotedSource('cluster*:*')).toBe(true);
    expect(shouldBeQuotedSource('*:index*')).toBe(true);
    expect(shouldBeQuotedSource('*:index|pattern')).toBe(true);
    expect(shouldBeQuotedSource('*:*')).toBe(true);
    expect(shouldBeQuotedSource('*:*,cluster*:index|pattern,i|p')).toBe(true);
    expect(shouldBeQuotedSource('index-[dd-mm]')).toBe(true);
  });
});

describe('getExpressionType', () => {
  const getASTForExpression = (expression: string) => {
    const { root } = parse(`FROM index | EVAL ${expression}`);
    return root.commands[1].args[0];
  };

  test('empty expression', () => {
    expect(getExpressionType(getASTForExpression(''))).toBe('unknown');
  });

  describe('literal expressions', () => {
    const cases: Array<{ expression: string; expectedType: SupportedDataType }> = [
      {
        expression: '1.0',
        expectedType: 'double',
      },
      {
        expression: '1',
        expectedType: 'integer',
      },
      {
        expression: 'true',
        expectedType: 'boolean',
      },
      {
        expression: '"foobar"',
        expectedType: 'keyword',
      },
      {
        expression: 'NULL',
        expectedType: 'null',
      },
      // TODO — consider whether we need to be worried about
      // differentiating between time_duration, and date_period
      // instead of just using time_literal
      {
        expression: '1 second',
        expectedType: 'time_literal',
      },
      {
        expression: '1 day',
        expectedType: 'time_literal',
      },
    ];
    test.each(cases)('detects a literal of type $expectedType', ({ expression, expectedType }) => {
      const ast = getASTForExpression(expression);
      expect(getExpressionType(ast)).toBe(expectedType);
    });
  });

  describe('inline casting', () => {
    const cases: Array<{ expression: string; expectedType: SupportedDataType }> = [
      { expectedType: 'boolean', expression: '"true"::bool' },
      { expectedType: 'boolean', expression: '"false"::boolean' },
      { expectedType: 'boolean', expression: '"false"::BooLEAN' },
      { expectedType: 'cartesian_point', expression: '""::cartesian_point' },
      { expectedType: 'cartesian_shape', expression: '""::cartesian_shape' },
      { expectedType: 'date_nanos', expression: '1::date_nanos' },
      { expectedType: 'date_period', expression: '1::date_period' },
      { expectedType: 'date', expression: '1::datetime' },
      { expectedType: 'double', expression: '1::double' },
      { expectedType: 'geo_point', expression: '""::geo_point' },
      { expectedType: 'geo_shape', expression: '""::geo_shape' },
      { expectedType: 'integer', expression: '1.2::int' },
      { expectedType: 'integer', expression: '1.2::integer' },
      { expectedType: 'ip', expression: '"123.12.12.2"::ip' },
      { expectedType: 'keyword', expression: '1::keyword' },
      { expectedType: 'long', expression: '1::long' },
      { expectedType: 'keyword', expression: '1::string' },
      { expectedType: 'keyword', expression: '1::text' },
      { expectedType: 'time_duration', expression: '1::time_duration' },
      { expectedType: 'unsigned_long', expression: '1::unsigned_long' },
      { expectedType: 'version', expression: '"1.2.3"::version' },
      { expectedType: 'version', expression: '"1.2.3"::VERSION' },
    ];
    test.each(cases)(
      'detects a casted literal of type $expectedType ($expression)',
      ({ expression, expectedType }) => {
        const ast = getASTForExpression(expression);
        expect(getExpressionType(ast)).toBe(expectedType);
      }
    );
  });

  describe('fields and variables', () => {
    it('detects the type of fields and variables which exist', () => {
      expect(
        getExpressionType(
          getASTForExpression('fieldName'),
          new Map([
            [
              'fieldName',
              {
                name: 'fieldName',
                type: 'geo_shape',
              },
            ],
          ]),
          new Map()
        )
      ).toBe('geo_shape');

      expect(
        getExpressionType(
          getASTForExpression('var0'),
          new Map(),
          new Map([
            [
              'var0',
              [
                {
                  name: 'var0',
                  type: 'long',
                  location: { min: 0, max: 0 },
                },
              ],
            ],
          ])
        )
      ).toBe('long');
    });

    it('handles fields and variables which do not exist', () => {
      expect(getExpressionType(getASTForExpression('fieldName'), new Map(), new Map())).toBe(
        'unknown'
      );
    });
  });

  describe('functions', () => {
    beforeAll(() => {
      setTestFunctions([
        {
          type: 'scalar',
          name: 'test',
          description: 'Test function',
          supportedCommands: ['eval'],
          signatures: [
            { params: [{ name: 'arg', type: 'keyword' }], returnType: 'keyword' },
            { params: [{ name: 'arg', type: 'double' }], returnType: 'double' },
            {
              params: [
                { name: 'arg', type: 'double' },
                { name: 'arg', type: 'keyword' },
              ],
              returnType: 'long',
            },
          ],
        },
        {
          type: 'scalar',
          name: 'returns_keyword',
          description: 'Test function',
          supportedCommands: ['eval'],
          signatures: [{ params: [], returnType: 'keyword' }],
        },
        {
          type: 'scalar',
          name: 'accepts_dates',
          description: 'Test function',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'date' },
                { name: 'arg2', type: 'date_period' },
              ],
              returnType: 'keyword',
            },
          ],
        },
      ]);
    });
    afterAll(() => {
      setTestFunctions([]);
    });

    it('detects the return type of a function', () => {
      expect(getExpressionType(getASTForExpression('returns_keyword()'))).toBe('keyword');
    });

    it('selects the correct signature based on the arguments', () => {
      expect(getExpressionType(getASTForExpression('test("foo")'))).toBe('keyword');
      expect(getExpressionType(getASTForExpression('test(1.)'))).toBe('double');
      expect(getExpressionType(getASTForExpression('test(1., "foo")'))).toBe('long');
    });

    it('supports nested functions', () => {
      expect(
        getExpressionType(getASTForExpression('test(1., test(test(test(returns_keyword()))))'))
      ).toBe('long');
    });

    it('supports functions with casted results', () => {
      expect(getExpressionType(getASTForExpression('test(1.)::keyword'))).toBe('keyword');
    });

    it('handles nulls and string-date casting', () => {
      expect(getExpressionType(getASTForExpression('test(NULL)'))).toBe('null');
      expect(getExpressionType(getASTForExpression('test(NULL, NULL)'))).toBe('null');
      expect(getExpressionType(getASTForExpression('accepts_dates("", "")'))).toBe('keyword');
    });

    it('deals with functions that do not exist', () => {
      expect(getExpressionType(getASTForExpression('does_not_exist()'))).toBe('unknown');
    });

    it('deals with bad function invocations', () => {
      expect(getExpressionType(getASTForExpression('test(1., "foo", "bar")'))).toBe('unknown');

      expect(getExpressionType(getASTForExpression('test()'))).toBe('unknown');

      expect(getExpressionType(getASTForExpression('test("foo", 1.)'))).toBe('unknown');
    });

    it('deals with the CASE function', () => {
      expect(getExpressionType(getASTForExpression('CASE(true, 1, 2)'))).toBe('integer');

      expect(getExpressionType(getASTForExpression('CASE(true, 1., true, 1., 2.)'))).toBe('double');

      expect(
        getExpressionType(
          getASTForExpression('CASE(true, "", true, "", keywordField)'),
          new Map([[`keywordField`, { name: 'keywordField', type: 'keyword' }]]),
          new Map()
        )
      ).toBe('keyword');

      expect(
        getExpressionType(
          getASTForExpression('CASE(true, "", true, "", keywordVar)'),
          new Map(),
          new Map([
            [`keywordVar`, [{ name: 'keywordVar', type: 'keyword', location: { min: 0, max: 0 } }]],
          ])
        )
      ).toBe('keyword');
    });

    it('supports COUNT(*)', () => {
      expect(getExpressionType(getASTForExpression('COUNT(*)'))).toBe<SupportedDataType>('long');
    });

    it('accounts for the "any" parameter type', () => {
      setTestFunctions([
        {
          type: 'scalar',
          name: 'test',
          description: 'Test function',
          supportedCommands: ['eval'],
          signatures: [{ params: [{ name: 'arg', type: 'any' }], returnType: 'keyword' }],
        },
      ]);
      expect(getExpressionType(getASTForExpression('test(1)'))).toBe('keyword');
    });
  });

  describe('lists', () => {
    const cases: Array<{ expression: string; expectedType: SupportedDataType | 'unknown' }> = [
      {
        expression: '["foo", "bar"]',
        expectedType: 'keyword',
      },
      {
        expression: '[1, 2]',
        expectedType: 'integer',
      },
      {
        expression: '[1., 2.]',
        expectedType: 'double',
      },
      {
        expression: '[null, null, null]',
        expectedType: 'null',
      },
      {
        expression: '[true, false]',
        expectedType: 'boolean',
      },
    ];

    test.each(cases)(
      'reports the type of $expression as $expectedType',
      ({ expression, expectedType }) => {
        const ast = getASTForExpression(expression);
        expect(getExpressionType(ast)).toBe(expectedType);
      }
    );
  });
});

describe('getBracketsToClose', () => {
  it('returns the number of brackets to close', () => {
    expect(getBracketsToClose('foo(bar(baz')).toEqual([')', ')']);
    expect(getBracketsToClose('foo(bar[baz')).toEqual([']', ')']);
    expect(getBracketsToClose('foo(bar[baz"bap')).toEqual(['"', ']', ')']);
    expect(
      getBracketsToClose(
        'from a | eval case(integerField < 0, "negative", integerField > 0, "positive", '
      )
    ).toEqual([')']);
  });
});
