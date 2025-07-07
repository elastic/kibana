/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse } from '../../parser';
import { SupportedDataType, FunctionDefinitionTypes } from '../types';
import { Location } from '../../commands_registry/types';
import { buildPartialMatcher, getExpressionType } from './expressions';
import { setTestFunctions } from './test_functions';

describe('buildPartialMatcher', () => {
  it('should build a partial matcher', () => {
    const str = 'is NoT nulL';
    const matcher = buildPartialMatcher(str);

    for (let i = 0; i < str.length; i++) {
      expect(matcher.test(str.slice(0, i + 1))).toEqual(true);
    }

    expect(matcher.test('not')).toEqual(false);
    expect(matcher.test('is null')).toEqual(false);
    expect(matcher.test('is not nullz')).toEqual(false);
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
      {
        expression: '1 second',
        expectedType: 'time_duration',
      },
      {
        expression: '1 day',
        expectedType: 'time_duration',
      },
      {
        expression: '?value',
        expectedType: 'param',
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

  describe('fields and userDefinedColumns', () => {
    it('detects the type of fields and userDefinedColumns which exist', () => {
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
          getASTForExpression('col0'),
          new Map(),
          new Map([
            [
              'col0',
              [
                {
                  name: 'col0',
                  type: 'long',
                  location: { min: 0, max: 0 },
                },
              ],
            ],
          ])
        )
      ).toBe('long');
    });

    it('handles fields and userDefinedColumns which do not exist', () => {
      expect(getExpressionType(getASTForExpression('fieldName'), new Map(), new Map())).toBe(
        'unknown'
      );
    });

    it('handles fields defined by a named param', () => {
      expect(getExpressionType(getASTForExpression('??field'), new Map(), new Map())).toBe('param');
    });
  });

  describe('functions', () => {
    beforeAll(() => {
      setTestFunctions([
        {
          type: FunctionDefinitionTypes.SCALAR,
          name: 'test',
          description: 'Test function',
          locationsAvailable: [Location.EVAL],
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
          type: FunctionDefinitionTypes.SCALAR,
          name: 'returns_keyword',
          description: 'Test function',
          locationsAvailable: [Location.EVAL],
          signatures: [{ params: [], returnType: 'keyword' }],
        },
        {
          type: FunctionDefinitionTypes.SCALAR,
          name: 'accepts_dates',
          description: 'Test function',
          locationsAvailable: [Location.EVAL],
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
          type: FunctionDefinitionTypes.SCALAR,
          name: 'test',
          description: 'Test function',
          locationsAvailable: [Location.EVAL],
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
