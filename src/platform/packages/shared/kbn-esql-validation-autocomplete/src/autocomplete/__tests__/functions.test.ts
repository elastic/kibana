/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { FunctionDefinitionTypes } from '@kbn/esql-ast';
import { Location, ISuggestionItem } from '@kbn/esql-ast/src/commands_registry/types';
import { setTestFunctions } from '@kbn/esql-ast/src/definitions/utils/test_functions';
import { getFunctionSignaturesByReturnType, setup, createCustomCallbackMocks } from './helpers';
import { uniq } from 'lodash';

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
        name: 'func_with_accepted_values',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'keyword',
                acceptedValues: ['value1', 'value2', 'value3'],
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'func_with_suggested_literals',
        description: '',
        signatures: [
          {
            params: [
              {
                name: 'arg',
                type: 'keyword',
                acceptedValues: ['value1', 'value2', 'value3'],
                literalSuggestions: ['value1'],
              },
            ],
            returnType: 'double',
          },
        ],
        locationsAvailable: [Location.EVAL],
      },
    ]);

    const { assertSuggestions } = await setup();

    await assertSuggestions('FROM index | EVAL FUNC_WITH_ACCEPTED_VALUES(/)', [
      '"value1"',
      '"value2"',
      '"value3"',
    ]);
    await assertSuggestions('FROM index | EVAL FUNC_WITH_SUGGESTED_LITERALS(/)', ['"value1"']);
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

  describe('license filtering', () => {
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
              license: 'PLATINUM',
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
              license: 'PLATINUM',
              returnType: 'keyword',
            },
          ],
          locationsAvailable: [Location.STATS],
          license: 'PLATINUM',
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
              license: 'PLATINUM',
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
          name: 'inner_platinum_function_mock',
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
          license: 'PLATINUM',
        },
      ]);
    });

    it('filters aggregation functions based on basic license', async () => {
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
      expect(basicSuggestions.some((s) => s.text.includes('PLATINUM_FUNCTION_MOCK'))).toBe(false);
      expect(basicSuggestions.some((s) => s.text.includes('PLATINUM_PARTIAL_FUNCTION_MOCK'))).toBe(
        true
      );
    });

    it('shows all aggregation functions with platinum license', async () => {
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
      expect(platinumSuggestions.some((s) => s.text.includes('PLATINUM_FUNCTION_MOCK'))).toBe(true);
      expect(
        platinumSuggestions.some((s) => s.text.includes('PLATINUM_PARTIAL_FUNCTION_MOCK'))
      ).toBe(true);
    });

    it('filters scalar functions inside PLATINUM_PARTIAL_FUNCTION_MOCK with basic license', async () => {
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
      expect(partialSuggestions.some((s) => s.text.includes('INNER_FUNCTION_MOCK'))).toBe(true);
      expect(partialSuggestions.some((s) => s.text.includes('INNER_PLATINUM_FUNCTION_MOCK'))).toBe(
        false
      );
    });

    it('shows all scalar functions inside PLATINUM_PARTIAL_FUNCTION_MOCK with platinum license', async () => {
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

      expect(partialPlatinumSuggestions.some((s) => s.text.includes('INNER_FUNCTION_MOCK'))).toBe(
        true
      );
      expect(
        partialPlatinumSuggestions.some((s) => s.text.includes('INNER_PLATINUM_FUNCTION_MOCK'))
      ).toBe(true);
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
