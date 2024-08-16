/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  setup,
  getFunctionSignaturesByReturnType,
  getFieldNamesByType,
  createCustomCallbackMocks,
  roundParameterTypes,
  getLiteralsByType,
  PartialSuggestionWithText,
  getDateLiteralsByFieldType,
} from './helpers';
import { ESQL_COMMON_NUMERIC_TYPES } from '../../shared/esql_types';
import { evalFunctionDefinitions } from '../../definitions/functions';
import { timeUnitsToSuggest } from '../../definitions/literals';
import { getUnitDuration } from '../factories';
import { getParamAtPosition } from '../helper';
import { nonNullable } from '../../shared/helpers';
import { partition } from 'lodash';
import {
  FunctionParameter,
  SupportedDataType,
  isFieldType,
  isSupportedDataType,
} from '../../definitions/types';

describe('autocomplete.suggest', () => {
  describe('eval', () => {
    test('suggestions', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions('from a | eval /', [
        'var0 = ',
        ...getFieldNamesByType('any'),
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ]);
      await assertSuggestions('from a | eval doubleField /', [
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'double',
        ]),
        ',',
        '| ',
      ]);
      await assertSuggestions('from index | EVAL keywordField not /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await assertSuggestions('from index | EVAL keywordField NOT /', [
        'LIKE $0',
        'RLIKE $0',
        'IN $0',
      ]);
      await assertSuggestions('from index | EVAL doubleField in /', ['( $0 )']);
      await assertSuggestions(
        'from index | EVAL doubleField in (/)',
        [
          ...getFieldNamesByType('double').filter((name) => name !== 'doubleField'),
          ...getFunctionSignaturesByReturnType('eval', 'double', { scalar: true }),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from index | EVAL doubleField not in /', ['( $0 )']);
      await assertSuggestions('from index | EVAL not /', [
        ...getFieldNamesByType('boolean'),
        ...getFunctionSignaturesByReturnType('eval', 'boolean', { scalar: true }),
      ]);
      await assertSuggestions(
        'from a | eval a=/',
        [...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true })],
        { triggerCharacter: '=' }
      );
      await assertSuggestions(
        'from a | eval a=abs(doubleField), b= /',
        [...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true })],
        { triggerCharacter: '=' }
      );
      await assertSuggestions('from a | eval a=doubleField, /', [
        'var0 = ',
        ...getFieldNamesByType('any'),
        'a',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ]);
      await assertSuggestions(
        'from a | eval a=round(/)',
        [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval a=raund(/)', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval a=raund(/', // note the typo in round
        []
      );
      await assertSuggestions(
        'from a | eval raund(/', // note the typo in round
        []
      );
      await assertSuggestions(
        'from a | eval raund(5, /', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval var0 = raund(5, /', // note the typo in round
        [],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from a | eval a=round(doubleField) /', [
        ',',
        '| ',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'double',
        ]),
      ]);
      await assertSuggestions(
        'from a | eval a=round(doubleField, /',
        [
          ...getFieldNamesByType('integer'),
          ...getFunctionSignaturesByReturnType('eval', 'integer', { scalar: true }, undefined, [
            'round',
          ]),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval round(doubleField, /',
        [
          ...getFieldNamesByType('integer'),
          ...getFunctionSignaturesByReturnType('eval', 'integer', { scalar: true }, undefined, [
            'round',
          ]),
        ],
        { triggerCharacter: '(' }
      );
      await assertSuggestions('from a | eval a=round(doubleField),/', [
        'var0 = ',
        ...getFieldNamesByType('any'),
        'a',
        ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
      ]);
      await assertSuggestions('from a | eval a=round(doubleField) + /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=round(doubleField)+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=doubleField+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions('from a | eval a=`any#Char$Field`+ /', [
        ...getFieldNamesByType(ESQL_COMMON_NUMERIC_TYPES),
        ...getFunctionSignaturesByReturnType('eval', ESQL_COMMON_NUMERIC_TYPES, {
          scalar: true,
        }),
      ]);
      await assertSuggestions(
        'from a | stats avg(doubleField) by keywordField | eval /',
        [
          'var0 = ',
          '`avg(doubleField)`',
          ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          // make aware EVAL of the previous STATS command
          callbacks: createCustomCallbackMocks([], undefined, undefined),
        }
      );
      await assertSuggestions(
        'from a | eval abs(doubleField) + 1 | eval /',
        [
          'var0 = ',
          ...getFieldNamesByType('any'),
          '`abs(doubleField) + 1`',
          ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
        ],
        { triggerCharacter: ' ' }
      );
      await assertSuggestions(
        'from a | stats avg(doubleField) by keywordField | eval /',
        [
          'var0 = ',
          '`avg(doubleField)`',
          ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          callbacks: createCustomCallbackMocks(
            [{ name: 'avg_doubleField_', type: 'double' }],
            undefined,
            undefined
          ),
        }
        // make aware EVAL of the previous STATS command with the buggy field name from expression
      );
      await assertSuggestions(
        'from a | stats avg(doubleField), avg(kubernetes.something.something) by keywordField | eval /',
        [
          'var0 = ',
          '`avg(doubleField)`',
          '`avg(kubernetes.something.something)`',
          ...getFunctionSignaturesByReturnType('eval', 'any', { scalar: true }),
        ],
        {
          triggerCharacter: ' ',
          // make aware EVAL of the previous STATS command with the buggy field name from expression
          callbacks: createCustomCallbackMocks(
            [{ name: 'avg_doubleField_', type: 'double' }],
            undefined,
            undefined
          ),
        }
      );

      await assertSuggestions(
        'from a | eval a=round(doubleField), b=round(/)',
        [
          ...getFieldNamesByType(roundParameterTypes),
          ...getFunctionSignaturesByReturnType(
            'eval',
            roundParameterTypes,
            { scalar: true },
            undefined,
            ['round']
          ),
        ],
        { triggerCharacter: '(' }
      );
      // test that comma is correctly added to the suggestions if minParams is not reached yet
      await assertSuggestions('from a | eval a=concat( /', [
        ...getFieldNamesByType(['text', 'keyword']).map((v) => `${v}, `),
        ...getFunctionSignaturesByReturnType(
          'eval',
          ['text', 'keyword'],
          { scalar: true },
          undefined,
          ['concat']
        ).map((v) => ({ ...v, text: `${v.text},` })),
      ]);
      await assertSuggestions(
        'from a | eval a=concat(textField, /',
        [
          ...getFieldNamesByType(['text', 'keyword']),
          ...getFunctionSignaturesByReturnType(
            'eval',
            ['text', 'keyword'],
            { scalar: true },
            undefined,
            ['concat']
          ),
        ],
        { triggerCharacter: ' ' }
      );
      // test that the arg type is correct after minParams
      await assertSuggestions(
        'from a | eval a=cidr_match(ipField, textField, /',
        [
          ...getFieldNamesByType('text'),
          ...getFunctionSignaturesByReturnType('eval', 'text', { scalar: true }, undefined, [
            'cidr_match',
          ]),
        ],
        { triggerCharacter: ' ' }
      );
      // test that comma is correctly added to the suggestions if minParams is not reached yet
      await assertSuggestions('from a | eval a=cidr_match(/', [
        ...getFieldNamesByType('ip').map((v) => `${v}, `),
        ...getFunctionSignaturesByReturnType('eval', 'ip', { scalar: true }, undefined, [
          'cidr_match',
        ]).map((v) => ({ ...v, text: `${v.text},` })),
      ]);
      await assertSuggestions(
        'from a | eval a=cidr_match(ipField, /',
        [
          ...getFieldNamesByType(['text', 'keyword']),
          ...getFunctionSignaturesByReturnType(
            'eval',
            ['text', 'keyword'],
            { scalar: true },
            undefined,
            ['cidr_match']
          ),
        ],
        { triggerCharacter: ' ' }
      );
      // test deep function nesting suggestions (and check that the same function is not suggested)
      // round(round(
      // round(round(round(
      // etc...

      for (const nesting of [1, 2, 3, 4]) {
        await assertSuggestions(
          `from a | eval a=${Array(nesting).fill('round(/').join('')}`,
          [
            ...getFieldNamesByType(roundParameterTypes),
            ...getFunctionSignaturesByReturnType(
              'eval',
              roundParameterTypes,
              { scalar: true },
              undefined,
              ['round']
            ),
          ],
          { triggerCharacter: '(' }
        );
      }

      const absParameterTypes = ['double', 'integer', 'long', 'unsigned_long'] as const;

      // Smoke testing for suggestions in previous position than the end of the statement
      await assertSuggestions('from a | eval var0 = abs(doubleField) / | eval abs(var0)', [
        ',',
        '| ',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'double',
        ]),
      ]);
      await assertSuggestions('from a | eval var0 = abs(b/) | eval abs(var0)', [
        ...getFieldNamesByType(absParameterTypes),
        ...getFunctionSignaturesByReturnType(
          'eval',
          absParameterTypes,
          { scalar: true },
          undefined,
          ['abs']
        ),
      ]);
    });

    describe('eval functions', () => {
      // // Test suggestions for each possible param, within each signature variation, for each function
      for (const fn of evalFunctionDefinitions) {
        // skip this fn for the moment as it's quite hard to test
        if (!['bucket', 'date_extract', 'date_diff', 'case'].includes(fn.name)) {
          test(`${fn.name}`, async () => {
            const { assertSuggestions } = await setup();

            for (const signature of fn.signatures) {
              for (const [i, param] of signature.params.entries()) {
                if (i < signature.params.length) {
                  // This ref signature thing is probably wrong in a few cases, but it matches
                  // the logic in getFunctionArgsSuggestions. They should both be updated
                  const refSignature = fn.signatures[0];
                  const requiresMoreArgs =
                    i + 1 < (refSignature.minParams ?? 0) ||
                    refSignature.params.filter(({ optional }, j) => !optional && j > i).length > 0;

                  const allParamDefs = fn.signatures
                    .map((s) => getParamAtPosition(s, i))
                    .filter(nonNullable);

                  // get all possible types for this param
                  const [constantOnlyParamDefs, acceptsFieldParamDefs] = partition(
                    allParamDefs,
                    (p) => p.constantOnly || /_literal/.test(p.type as string)
                  );

                  const getTypesFromParamDefs = (
                    paramDefs: FunctionParameter[]
                  ): SupportedDataType[] =>
                    Array.from(new Set(paramDefs.map((p) => p.type))).filter(isSupportedDataType);

                  const suggestedConstants = param.literalSuggestions || param.literalOptions;

                  const addCommaIfRequired = (s: string | PartialSuggestionWithText) => {
                    // don't add commas to the empty string or if there are no more required args
                    if (!requiresMoreArgs || s === '' || (typeof s === 'object' && s.text === '')) {
                      return s;
                    }
                    return typeof s === 'string' ? `${s}, ` : { ...s, text: `${s.text},` };
                  };

                  await assertSuggestions(
                    `from a | eval ${fn.name}(${Array(i).fill('field').join(', ')}${
                      i ? ',' : ''
                    } /)`,
                    suggestedConstants?.length
                      ? suggestedConstants.map(
                          (option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`
                        )
                      : [
                          ...getDateLiteralsByFieldType(
                            getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                          ),
                          ...getFieldNamesByType(
                            getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                          ),
                          ...getFunctionSignaturesByReturnType(
                            'eval',
                            getTypesFromParamDefs(acceptsFieldParamDefs),
                            { scalar: true },
                            undefined,
                            [fn.name]
                          ),
                          ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)),
                        ].map(addCommaIfRequired),
                    { triggerCharacter: ' ' }
                  );
                  await assertSuggestions(
                    `from a | eval var0 = ${fn.name}(${Array(i).fill('field').join(', ')}${
                      i ? ',' : ''
                    } /)`,
                    suggestedConstants?.length
                      ? suggestedConstants.map(
                          (option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`
                        )
                      : [
                          ...getDateLiteralsByFieldType(
                            getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                          ),
                          ...getFieldNamesByType(
                            getTypesFromParamDefs(acceptsFieldParamDefs).filter(isFieldType)
                          ),
                          ...getFunctionSignaturesByReturnType(
                            'eval',
                            getTypesFromParamDefs(acceptsFieldParamDefs),
                            { scalar: true },
                            undefined,
                            [fn.name]
                          ),
                          ...getLiteralsByType(getTypesFromParamDefs(constantOnlyParamDefs)),
                        ].map(addCommaIfRequired),
                    { triggerCharacter: ' ' }
                  );
                }
              }
            }
          });
        }

        // @TODO
        // The above test fails cause it expects nested functions like
        // DATE_EXTRACT(concat("aligned_day_","of_week_in_month"), date) to also be suggested
        // which is actually valid according to func signature
        // but currently, our autocomplete only suggests the literal suggestions
        if (['date_extract', 'date_diff'].includes(fn.name)) {
          test(`${fn.name}`, async () => {
            const { assertSuggestions } = await setup();
            const firstParam = fn.signatures[0].params[0];
            const suggestedConstants = firstParam?.literalSuggestions || firstParam?.literalOptions;
            const requiresMoreArgs = true;

            await assertSuggestions(
              `from a | eval ${fn.name}(/`,
              suggestedConstants?.length
                ? [
                    ...suggestedConstants.map(
                      (option) => `"${option}"${requiresMoreArgs ? ', ' : ''}`
                    ),
                  ]
                : []
            );
          });
        }
      }
    });

    test('date math', async () => {
      const { assertSuggestions } = await setup();
      const dateSuggestions = timeUnitsToSuggest.map(({ name }) => name);

      await assertSuggestions('from a | eval var0 = bucket(@timestamp, /', getUnitDuration(1), {
        triggerCharacter: ' ',
      });

      // If a literal number is detected then suggest also date period keywords
      await assertSuggestions(
        'from a | eval a = 1 /',
        [
          ...dateSuggestions,
          ',',
          '| ',
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'integer',
          ]),
        ],
        { triggerCharacter: ' ' }
      );
      await assertSuggestions('from a | eval a = 1 year /', [
        ',',
        '| ',
        ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
          'time_interval',
        ]),
      ]);
      await assertSuggestions('from a | eval a = 1 day + 2 /', [',', '| ']);
      await assertSuggestions(
        'from a | eval 1 day + 2 /',
        [
          ...dateSuggestions,
          ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true, skipAssign: true }, [
            'integer',
          ]),
        ],
        { triggerCharacter: ' ' }
      );
      await assertSuggestions(
        'from a | eval var0=date_trunc(/)',
        getLiteralsByType('time_literal').map((t) => `${t}, `),
        { triggerCharacter: '(' }
      );
      await assertSuggestions(
        'from a | eval var0=date_trunc(2 /)',
        [...dateSuggestions.map((t) => `${t}, `), ','],
        { triggerCharacter: ' ' }
      );
    });
  });
});
