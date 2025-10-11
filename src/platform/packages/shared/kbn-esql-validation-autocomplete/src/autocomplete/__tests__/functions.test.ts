/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { FunctionDefinitionTypes } from '@kbn/esql-ast';
import type { ISuggestionItem } from '@kbn/esql-ast/src/commands_registry/types';
import { Location } from '@kbn/esql-ast/src/commands_registry/types';
import { setTestFunctions } from '@kbn/esql-ast/src/definitions/utils/test_functions';
import { getFunctionSignaturesByReturnType, setup, createCustomCallbackMocks } from './helpers';
import { uniq } from 'lodash';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import {
  arithmeticOperators,
  comparisonFunctions,
  logicalOperators,
} from '@kbn/esql-ast/src/definitions/all_operators';

describe('functions arg suggestions', () => {
  afterEach(() => {
    setTestFunctions([]);
  });

  describe('constantOnly parameter constraints', () => {
    it('DATE_DIFF-like function suggests only constants in WHERE (no fields)', async () => {
      setTestFunctions([
        {
          type: FunctionDefinitionTypes.SCALAR,
          name: 'date_diff_like',
          description: '',
          signatures: [
            {
              params: [
                {
                  name: 'unit',
                  type: 'keyword',
                  constantOnly: true,
                  suggestedValues: ['year', 'month', 'day', 'hour', 'minute'],
                },
                { name: 'left', type: 'date' },
                { name: 'right', type: 'date' },
              ],
              returnType: 'integer',
            },
          ],
          locationsAvailable: [Location.WHERE, Location.EVAL, Location.STATS],
        },
      ]);

      const { assertSuggestions } = await setup();
      await assertSuggestions('FROM index | WHERE DATE_DIFF_LIKE(/)', [
        '"year", ',
        '"month", ',
        '"day", ',
        '"hour", ',
        '"minute", ',
      ]);
    });

    it('PERCENTILE-like function has constant-only second parameter in STATS', async () => {
      setTestFunctions([
        {
          type: FunctionDefinitionTypes.AGG,
          name: 'percentile_like',
          description: '',
          signatures: [
            {
              params: [
                { name: 'field', type: 'double' },
                { name: 'percent', type: 'double', constantOnly: true },
              ],
              returnType: 'double',
            },
          ],
          locationsAvailable: [Location.STATS],
        },
      ]);

      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | STATS PERCENTILE_LIKE(integerField, /)');
      const labels = suggestions.map(({ label }) => label);
      ['doubleField', 'integerField', 'longField', 'unsignedLongField'].forEach((f) =>
        expect(labels).not.toContain(f)
      );
    });

    it('TOP-like function order param suggests specific literals', async () => {
      setTestFunctions([
        {
          type: FunctionDefinitionTypes.AGG,
          name: 'top_like',
          description: '',
          signatures: [
            {
              params: [
                { name: 'field', type: 'keyword' },
                { name: 'limit', type: 'integer', constantOnly: true },
                {
                  name: 'order',
                  type: 'keyword',
                  constantOnly: true,
                  suggestedValues: ['asc', 'desc'],
                },
              ],
              returnType: 'keyword',
            },
          ],
          locationsAvailable: [Location.STATS],
        },
      ]);

      const { assertSuggestions } = await setup();
      await assertSuggestions('FROM index | STATS TOP_LIKE(keywordField, 10, /)', [
        '"asc"',
        '"desc"',
      ]);
    });
  });

  describe('generic operator suggestions in functions', () => {
    it('numeric functions suggest only arithmetic operators after numeric expression (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = SQRT(doubleField /)');
      const labels = suggestions.map(({ label }) => label);

      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());
      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      const logical = logicalOperators.map(({ name }) => name.toUpperCase());

      expect(labels).toEqual(expect.arrayContaining(arithmetic));
      comparison.forEach((operatorName) => expect(labels).not.toContain(operatorName));
      logical.forEach((operatorName) => expect(labels).not.toContain(operatorName));
    });

    it('suggests numeric fields and functions after operator in function (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = ROUND(doubleField + /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['doubleField', 'integerField', 'longField']));
      expect(labels).toEqual(expect.arrayContaining(['ABS', 'CEIL', 'FLOOR']));
    });

    it('comma suggestion for optional parameters (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = ROUND(doubleField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining([',']));
      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());
      expect(labels).toEqual(expect.arrayContaining(arithmetic));
    });

    it('nested function parent exclusion for suggestions', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CEIL(FLOOR(ABS(/)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(
        expect.arrayContaining(['doubleField', 'integerField', 'longField', 'unsignedLongField'])
      );
      expect(labels).not.toContain('ABS');
      expect(labels).not.toContain('CEIL');
      expect(labels).not.toContain('FLOOR');
      expect(labels).toEqual(expect.arrayContaining(['ROUND', 'SQRT']));
    });

    it('multi-parameter functions accept numeric expressions in later parameters', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = POW(doubleField + 2, /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(
        expect.arrayContaining(['doubleField', 'integerField', 'longField', 'unsignedLongField'])
      );
      expect(labels).not.toContain('POW');
      expect(labels).toEqual(expect.arrayContaining(['ABS', 'ROUND', 'CEIL', 'FLOOR']));
    });

    it('string functions suggest comma after string field, not math operators (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CONCAT(textField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining([',']));
      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());
      arithmetic.forEach((op) => expect(labels).not.toContain(op));
    });

    it('TRIM in WHERE should not suggest comparison operators after string parameter', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | WHERE TRIM(textField /)');
      const labels = suggestions.map(({ label }) => label);

      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      comparison.forEach((operatorName) => expect(labels).not.toContain(operatorName));
    });
  });

  describe('type-specific and CASE/date behaviors (generic)', () => {
    it('ABS suggests only numeric fields and excludes itself', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = ABS(/)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(
        expect.arrayContaining(['doubleField', 'integerField', 'longField', 'unsignedLongField'])
      );
      expect(labels).toEqual(expect.arrayContaining(['ROUND', 'CEIL', 'FLOOR']));
      expect(labels).not.toContain('ABS');
    });

    it('TRIM suggests text/keyword fields and excludes itself', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = TRIM(/)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['textField', 'keywordField']));
      expect(labels).toEqual(
        expect.arrayContaining(['CONCAT', 'SUBSTRING', 'TO_UPPER', 'TO_LOWER'])
      );
      expect(labels).not.toContain('TRIM');
    });

    it('keyword and text are interchangeable in COALESCE second param', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = COALESCE(textField, /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['textField', 'keywordField']));
      expect(labels).toEqual(expect.arrayContaining(['CONCAT', 'SUBSTRING']));
    });

    it('handles unknown field types gracefully in numeric context', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = ABS(unknownField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['doubleField', 'integerField', 'longField']));
      expect(labels).toEqual(expect.arrayContaining(['ROUND', 'CEIL', 'FLOOR']));
      expect(labels).not.toContain('ABS');
    });

    it('CASE accepts non-boolean fields as condition (operators list)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CASE(textField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(
        expect.arrayContaining(['==', 'IN', 'LIKE', 'NOT IN', 'IS NULL', 'IS NOT NULL'])
      );
    });

    it('IN inside CASE suggests opening list (EVAL)', async () => {
      const { suggest } = await setup();
      // Cursor right after the IN token inside CASE first parameter
      const suggestions = await suggest('FROM index | EVAL result = CASE(integerField IN /)');
      const texts = suggestions.map(({ text }) => text);

      // Should suggest opening a list snippet for the right-hand side
      expect(texts).toContain('( $0 )');
    });

    it('NOT IN inside CASE suggests opening list (EVAL)', async () => {
      const { suggest } = await setup();
      // Cursor right after the NOT IN token inside CASE first parameter
      const suggestions = await suggest('FROM index | EVAL result = CASE(integerField NOT IN /)');
      const texts = suggestions.map(({ text }) => text);

      // Should suggest opening a list snippet for the right-hand side
      expect(texts).toContain('( $0 )');
    });

    it('date literals and fields for DATE_DIFF', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = DATE_DIFF("day", /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['dateField']));
      expect(labels).toEqual(expect.arrayContaining(['DATE_PARSE', 'DATE_TRUNC', 'TO_DATE_NANOS']));
      expect(labels).toEqual(expect.arrayContaining(['Choose from the time picker']));
    });

    it('DATE_PARSE accepts string fields and functions', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = DATE_PARSE(/)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['textField', 'keywordField']));
      expect(labels).toEqual(expect.arrayContaining(['CONCAT', 'SUBSTRING']));
      expect(labels).not.toContain('doubleField');
      expect(labels).not.toContain('integerField');
    });

    it('boolean expressions with logical operators inside CASE', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CASE(doubleField > 10 AND /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['booleanField']));
      expect(labels).toEqual(
        expect.arrayContaining(['doubleField', 'integerField', 'textField', 'dateField'])
      );
      expect(labels).toEqual(expect.arrayContaining(['ABS', 'CONCAT', 'DATE_DIFF']));
    });
  });
  it('suggests based on available signatures and existing params', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'func',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'integer',
              },
            ],
            returnType: 'double',
          },
          {
            params: [
              {
                name: 'arg',
                type: 'long',
              },
            ],
            returnType: 'double',
          },
          {
            params: [
              {
                name: 'arg',
                type: 'double',
              },
              {
                name: 'arg2',
                type: 'double',
              },
            ],
            returnType: 'double',
          },
          {
            params: [
              {
                name: 'arg',
                type: 'double',
              },
              {
                name: 'arg2',
                type: 'long',
              },
              {
                name: 'arg3',
                type: 'long',
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const doubleSuggestions = [
      'doubleField',
      'kubernetes.something.something',
      '`any#Char$Field`',
      ...getFunctionSignaturesByReturnType(Location.EVAL, ['double'], { scalar: true }).map(
        ({ text }) => text
      ),
    ];

    const integerSuggestions = [
      'integerField',
      ...getFunctionSignaturesByReturnType(Location.EVAL, ['integer'], { scalar: true }).map(
        ({ text }) => text
      ),
    ];

    const longSuggestions = [
      'longField',
      ...getFunctionSignaturesByReturnType(Location.EVAL, ['long'], { scalar: true }).map(
        ({ text }) => text
      ),
    ];

    const { assertSuggestions } = await setup();

    await assertSuggestions(
      'FROM index | EVAL FUNC(/)',
      uniq([...doubleSuggestions, ...integerSuggestions, ...longSuggestions])
    );
    await assertSuggestions(
      'FROM index | EVAL FUNC(doubleField, /)',
      uniq([...doubleSuggestions, ...longSuggestions])
    );
    await assertSuggestions('FROM index | EVAL FUNC(doubleField, doubleField, /)', []);
    await assertSuggestions('FROM index | EVAL FUNC(doubleField, longField, /)', longSuggestions);
  });

  it('suggests accepted values or suggested literals', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'func_with_suggested_values',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'keyword',
                suggestedValues: ['value1', 'value2', 'value3'],
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const { assertSuggestions } = await setup();

    await assertSuggestions('FROM index | EVAL FUNC_WITH_SUGGESTED_VALUES(/)', [
      '"value1"',
      '"value2"',
      '"value3"',
    ]);
  });

  it('respects constant-only', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'func_with_constant_only_param',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'keyword',
                constantOnly: true,
              },
              {
                name: 'arg2',
                type: 'keyword',
                constantOnly: false,
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const { suggest } = await setup();

    const isColumn = (s: ISuggestionItem) => s.kind === 'Variable';

    const constantOnlySuggestions = await suggest(
      'FROM index | EVAL FUNC_WITH_CONSTANT_ONLY_PARAM(/)'
    );
    expect(constantOnlySuggestions.every((s) => !isColumn(s))).toBe(true);

    // negative test: make sure columns are correctly detected when present
    const nonConstantOnlySuggestions = await suggest(
      'FROM index | EVAL FUNC_WITH_CONSTANT_ONLY_PARAM("lolz", /)'
    );
    expect(nonConstantOnlySuggestions.every((s) => !isColumn(s))).toBe(false);
  });

  describe('Tier and license-based autocomplete suggestions', () => {
    beforeEach(() => {
      setTestFunctions([
        {
          type: FunctionDefinitionTypes.GROUPING,
          name: 'platinum_function_mock',
          description: '',
          signatures: [
            {
              params: [
                {
                  name: 'field',
                  type: 'keyword',
                  optional: false,
                },
              ],
              license: 'platinum',
              returnType: 'keyword',
            },
            {
              params: [
                {
                  name: 'field',
                  type: 'text',
                  optional: false,
                },
              ],
              license: 'platinum',
              returnType: 'keyword',
            },
          ],
          locationsAvailable: [Location.STATS],
          license: 'platinum',
          observabilityTier: 'COMPLETE',
        },
        {
          type: FunctionDefinitionTypes.AGG,
          name: 'platinum_partial_function_mock',
          description: '',
          signatures: [
            {
              params: [
                {
                  name: 'field',
                  type: 'cartesian_point',
                  optional: false,
                },
              ],
              returnType: 'cartesian_shape',
            },
            {
              params: [
                {
                  name: 'field',
                  type: 'cartesian_shape',
                  optional: false,
                },
              ],
              license: 'platinum',
              returnType: 'cartesian_shape',
            },
          ],
          locationsAvailable: [Location.STATS],
        },
        {
          type: FunctionDefinitionTypes.SCALAR,
          name: 'inner_function_mock',
          description: '',
          signatures: [
            {
              params: [
                {
                  name: 'field',
                  type: 'cartesian_point',
                  optional: false,
                },
              ],
              returnType: 'cartesian_point',
            },
            {
              params: [
                {
                  name: 'field',
                  type: 'keyword',
                  optional: false,
                },
              ],
              returnType: 'cartesian_point',
            },
          ],
          locationsAvailable: [Location.STATS],
        },
        {
          type: FunctionDefinitionTypes.SCALAR,
          name: 'inner_function_platinum_mock',
          description: '',
          signatures: [
            {
              params: [
                {
                  name: 'field',
                  type: 'cartesian_point',
                  optional: false,
                },
              ],
              returnType: 'cartesian_shape',
            },
            {
              params: [
                {
                  name: 'field',
                  type: 'cartesian_shape',
                  optional: false,
                },
              ],
              returnType: 'cartesian_shape',
            },
          ],
          locationsAvailable: [Location.STATS],
          license: 'platinum',
        },
      ]);
    });

    it('should hide PLATINUM license functions when user has BASIC license', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const basicLicenseCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() !== 'platinum',
          })
        ),
      };

      const basicSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: basicLicenseCallbacks,
      });

      // Should include basic function but not platinum function
      expect(basicSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(false);
      expect(basicSuggestions.some((s) => s.text.match('PLATINUM_PARTIAL_FUNCTION_MOCK'))).toBe(
        true
      );
    });

    it('should show all aggregation functions when user has PLATINUM license', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'platinum',
          })
        ),
      };

      const platinumSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: platinumLicenseCallbacks,
      });

      // Should include all functions
      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(true);
      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_PARTIAL_FUNCTION_MOCK'))).toBe(
        true
      );
    });

    it('should filter function arguments inside mixed-signature functions with BASIC license', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const basicLicenseCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() !== 'platinum',
          })
        ),
      };

      const partialSuggestions = await suggest(
        'FROM index | STATS agg = PLATINUM_PARTIAL_FUNCTION_MOCK( /',
        {
          callbacks: basicLicenseCallbacks,
        }
      );

      // Should include basic function but not platinum function
      expect(partialSuggestions.some((s) => s.text.match('INNER_FUNCTION_MOCK'))).toBe(true);
      expect(partialSuggestions.some((s) => s.text.match('INNER_FUNCTION_PLATINUM_MOCK'))).toBe(
        false
      );
    });

    it('should show all function arguments inside mixed-signature functions with PLATINUM license', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'platinum',
          })
        ),
      };

      const partialPlatinumSuggestions = await suggest(
        'FROM index | STATS agg = PLATINUM_PARTIAL_FUNCTION_MOCK( /',
        {
          callbacks: platinumLicenseCallbacks,
        }
      );

      expect(partialPlatinumSuggestions.some((s) => s.text.match('INNER_FUNCTION_MOCK'))).toBe(
        true
      );
      expect(
        partialPlatinumSuggestions.some((s) => s.text.match('INNER_FUNCTION_PLATINUM_MOCK'))
      ).toBe(true);
    });

    it('should show PLATINUM_FUNCTION_MOCK when user has Platinum license and Observability tier complete', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseAndObservabilityTierCompleteCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'platinum',
          })
        ),
        getActiveProduct: jest.fn(
          () => ({ type: 'observability', tier: 'complete' } as PricingProduct)
        ),
      };

      const platinumSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: platinumLicenseAndObservabilityTierCompleteCallbacks,
      });

      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(true);
    });

    it('should not show PLATINUM_FUNCTION_MOCK when user has basic license and Observability tier complete', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseAndObservabilityTierCompleteCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'basic',
          })
        ),
        getActiveProduct: jest.fn(
          () => ({ type: 'observability', tier: 'complete' } as PricingProduct)
        ),
      };

      const platinumSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: platinumLicenseAndObservabilityTierCompleteCallbacks,
      });

      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(false);
    });

    it('should not show PLATINUM_FUNCTION_MOCK when user has Platinum license and Observability tier log_essentials', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseAndObservabilityTierLogCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'platinum',
          })
        ),
        getActiveProduct: jest.fn(
          () => ({ type: 'observability', tier: 'logs_essentials' } as PricingProduct)
        ),
      };

      const platinumSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: platinumLicenseAndObservabilityTierLogCallbacks,
      });

      // Should not include PLATINUM_FUNCTION_MOCK
      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(false);
    });

    it('should show PLATINUM_FUNCTION_MOCK when user has Platinum license and Security tier complete', async () => {
      const { suggest } = await setup();
      const callbacks = createCustomCallbackMocks();

      const platinumLicenseAndObservabilityTierLogCallbacks = {
        ...callbacks,
        getLicense: jest.fn(async () =>
          Promise.resolve({
            hasAtLeast: (license: string) => license.toLowerCase() === 'platinum',
          })
        ),
        getActiveProduct: jest.fn(
          () =>
            ({
              type: 'security',
              tier: 'essentials',
              product_lines: [],
            } as PricingProduct)
        ),
      };

      const platinumSuggestions = await suggest('FROM index | STATS agg = /', {
        callbacks: platinumLicenseAndObservabilityTierLogCallbacks,
      });

      expect(platinumSuggestions.some((s) => s.text.match('PLATINUM_FUNCTION_MOCK'))).toBe(true);
    });

    it('string functions with concatenation', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CONCAT(textField, " - ", /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['textField', 'keywordField']));
      expect(labels).not.toContain('CONCAT');
      expect(labels).toEqual(expect.arrayContaining(['SUBSTRING', 'TO_UPPER', 'TO_LOWER', 'TRIM']));
      expect(labels).toEqual(expect.arrayContaining(['MV_CONCAT']));
    });

    it('boolean fields suggest logical operators AND/OR, not math operators', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | WHERE booleanField /');
      const labels = suggestions.map(({ label }) => label);

      const logical = logicalOperators.map(({ name }) => name.toUpperCase());
      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());

      expect(labels).toEqual(expect.arrayContaining(logical));
      arithmetic.forEach((op) => expect(labels).not.toContain(op));
    });

    it('date fields suggest comparison and date arithmetic operators', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | WHERE dateField /');
      const labels = suggestions.map(({ label }) => label);

      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      expect(labels).toEqual(expect.arrayContaining(comparison));
      expect(labels).toEqual(expect.arrayContaining(['+', '-']));
      expect(labels).not.toContain('*');
      expect(labels).not.toContain('/');
      expect(labels).not.toContain('%');
    });

    it('numeric-only function parameter suggests only arithmetic operators for numeric fields in WHERE', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest(
        'FROM index | WHERE TO_AGGREGATE_METRIC_DOUBLE(integerField /)'
      );
      const labels = suggestions.map(({ label }) => label);

      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());
      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      const logical = logicalOperators.map(({ name }) => name.toUpperCase());

      expect(labels).toEqual(expect.arrayContaining(arithmetic));
      comparison.forEach((operatorName) => expect(labels).not.toContain(operatorName));
      logical.forEach((operatorName) => expect(labels).not.toContain(operatorName));
    });

    describe('COALESCE commas and operators (generic cases)', () => {
      it.each([
        {
          name: 'first param string: comma and string operators',
          query: 'FROM index | EVAL result = COALESCE(textField /)',
          expectComma: true,
          expectContains: ['==', '!=', 'LIKE', 'IN'],
        },
        {
          name: 'first param numeric: comma and arithmetic/comparison',
          query: 'FROM index | EVAL result = COALESCE(integerField /)',
          expectComma: true,
          expectContains: [
            ...arithmeticOperators.map(({ name }) => name.toUpperCase()),
            ...comparisonFunctions.map(({ name }) => name.toUpperCase()),
          ],
        },
        {
          name: 'after complete expression: comma and logical operators',
          query: 'FROM index | EVAL result = COALESCE(textField == "test" /)',
          expectComma: true,
          expectContains: ['AND', 'OR'],
        },
        {
          name: 'second param string: no comma, string functions',
          query: 'FROM index | EVAL result = COALESCE(textField, /)',
          expectComma: false,
          expectContains: ['textField', 'keywordField', 'CONCAT', 'SUBSTRING'],
        },
        {
          name: 'second param numeric: no comma, numeric functions',
          query: 'FROM index | EVAL result = COALESCE(integerField, /)',
          expectComma: false,
          expectContains: ['integerField', 'ABS', 'ROUND'],
        },
      ])('$name', async ({ query, expectComma, expectContains }) => {
        const { suggest } = await setup();
        const suggestions = await suggest(query);
        const labels = suggestions.map(({ label }) => label);

        expect(labels).toEqual(expect.arrayContaining(expectContains));
        if (expectComma) {
          expect(labels).toEqual(expect.arrayContaining([',']));
        } else {
          expect(labels).not.toContain(',');
        }
      });
    });

    it('COALESCE return type matches first parameter - accepts type-compatible expressions', async () => {
      const { suggest } = await setup();

      const suggestionsNum = await suggest('FROM index | EVAL result = COALESCE(integerField, /)');
      const labelsNum = suggestionsNum.map(({ label }) => label);
      expect(labelsNum).toEqual(expect.arrayContaining(['integerField', 'ABS', 'ROUND']));
      ['textField', 'booleanField', 'dateField'].forEach((v) => expect(labelsNum).not.toContain(v));

      const suggestionsText = await suggest('FROM index | EVAL result = COALESCE(textField, /)');
      const labelsText = suggestionsText.map(({ label }) => label);
      expect(labelsText).toEqual(
        expect.arrayContaining(['textField', 'keywordField', 'CONCAT', 'SUBSTRING'])
      );
      ['doubleField', 'booleanField', 'integerField'].forEach((v) =>
        expect(labelsText).not.toContain(v)
      );

      const suggestionsDate = await suggest('FROM index | EVAL result = COALESCE(dateField, /)');
      const labelsDate = suggestionsDate.map(({ label }) => label);
      expect(labelsDate).toEqual(
        expect.arrayContaining([
          'dateField',
          'DATE_PARSE',
          'DATE_TRUNC',
          'Choose from the time picker',
        ])
      );
      ['textField', 'doubleField', 'booleanField'].forEach((v) =>
        expect(labelsDate).not.toContain(v)
      );

      const suggestionsBool = await suggest('FROM index | EVAL result = COALESCE(booleanField, /)');
      const labelsBool = suggestionsBool.map(({ label }) => label);
      expect(labelsBool).toEqual(
        expect.arrayContaining([
          'booleanField',
          'textField',
          'doubleField',
          'integerField',
          'dateField',
        ])
      );
    });
  });

  describe('cross-command homogeneity for generic behaviors', () => {
    it.each([
      ['EVAL', 'FROM index | EVAL result = SQRT(doubleField /)'],
      ['STATS', 'FROM index | STATS result = SQRT(doubleField /)'],
    ])('only arithmetic operators after numeric expression (%s)', async (_ctx, query) => {
      const { suggest } = await setup();
      const suggestions = await suggest(query);
      const labels = suggestions.map(({ label }) => label);

      const arithmetic = arithmeticOperators.map(({ name }) => name.toUpperCase());
      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      const logical = logicalOperators.map(({ name }) => name.toUpperCase());

      expect(labels).toEqual(expect.arrayContaining(arithmetic));
      comparison.forEach((operatorName) => expect(labels).not.toContain(operatorName));
      logical.forEach((operatorName) => expect(labels).not.toContain(operatorName));
    });

    it.each([
      ['EVAL', 'FROM index | EVAL result = ROUND(doubleField + /)'],
      ['STATS', 'FROM index | STATS result = ROUND(doubleField + /)'],
    ])('numeric fields and functions after operator in function (%s)', async (_ctx, query) => {
      const { suggest } = await setup();
      const suggestions = await suggest(query);
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining(['doubleField', 'integerField', 'longField']));
      expect(labels).toEqual(expect.arrayContaining(['ABS', 'CEIL', 'FLOOR']));
    });

    it('CASE first parameter operators for text (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = CASE(textField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(
        expect.arrayContaining(['==', '!=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'])
      );
    });

    it('CASE first parameter operators for text (STATS)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | STATS result = CASE(textField /)');
      const labels = suggestions.map(({ label }) => label);

      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      expect(labels).toEqual(expect.arrayContaining(comparison));
    });

    // Note: partial operators inside STATS (IS/IN/LIKE) may require AST path; validation layer can be empty
    // We only assert initial comparison operators for STATS in the previous test.

    it('COALESCE first param string: comma and operators (EVAL)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | EVAL result = COALESCE(textField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining([',']));
      expect(labels).toEqual(expect.arrayContaining(['==', '!=', 'LIKE', 'IN']));
    });

    it('COALESCE first param string: comma present; comparison operators available (STATS)', async () => {
      const { suggest } = await setup();
      const suggestions = await suggest('FROM index | STATS result = COALESCE(textField /)');
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual(expect.arrayContaining([',']));
      const comparison = comparisonFunctions.map(({ name }) => name.toUpperCase());
      expect(labels).toEqual(expect.arrayContaining(comparison));
    });
  });

  it('treats text and keyword as interchangeable', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'accepts_keyword',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'text',
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'accepts_keyword_and_text',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'keyword',
              },
            ],
            returnType: 'double',
          },
          {
            params: [
              {
                name: 'arg',
                type: 'text',
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'accepts_text',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'text',
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const expected = [
      'keywordField',
      'textField',
      ...getFunctionSignaturesByReturnType(Location.EVAL, ['keyword', 'text'], {
        scalar: true,
      }).map(({ text }) => text),
    ];

    const { assertSuggestions } = await setup();

    await assertSuggestions('FROM index | EVAL ACCEPTS_KEYWORD_AND_TEXT(/)', expected);
    await assertSuggestions('FROM index | EVAL ACCEPTS_KEYWORD(/)', expected);
    await assertSuggestions('FROM index | EVAL ACCEPTS_TEXT(/)', expected);
  });
});
