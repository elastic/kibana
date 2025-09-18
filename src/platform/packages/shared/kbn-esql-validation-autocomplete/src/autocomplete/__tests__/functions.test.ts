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

describe('functions arg suggestions', () => {
  afterEach(() => {
    setTestFunctions([]);
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

    it('should filter  function arguments inside mixed-signature functions with BASIC license', async () => {
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
