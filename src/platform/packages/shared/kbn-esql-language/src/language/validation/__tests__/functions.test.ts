/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type FunctionDefinition,
  FunctionDefinitionTypes,
} from '../../../commands/definitions/types';
import { getNoValidCallSignatureError } from '../../../commands/definitions/utils/validation/utils';
import { Location } from '../../../commands/registry/types';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import { setup } from './helpers';
import { PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING } from '../../../commands/definitions/utils/expressions';

describe('function validation', () => {
  afterEach(() => {
    setTestFunctions([]);
  });

  describe('parameter validation', () => {
    describe('type validation', () => {
      describe('basic checks', () => {
        beforeEach(() => {
          const definitions: FunctionDefinition[] = [
            {
              name: 'test',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [{ name: 'arg1', type: 'integer' }],
                  returnType: 'integer',
                },
                {
                  params: [{ name: 'arg1', type: 'date' }],
                  returnType: 'date',
                },
              ],
            },
            {
              name: 'returns_integer',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [],
                  returnType: 'integer',
                },
              ],
            },
            {
              name: 'returns_double',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [],
                  returnType: 'double',
                },
              ],
            },
          ];

          setTestFunctions(definitions);
        });

        it('accepts arguments of the correct type', async () => {
          const { expectErrors } = await setup();

          // straight call
          await expectErrors('FROM a_index | EVAL TEST(1)', []);
          await expectErrors('FROM a_index | EVAL TEST(NOW())', []);

          // assignment
          await expectErrors('FROM a_index | EVAL var = TEST(1)', []);
          await expectErrors('FROM a_index | EVAL var = TEST(NOW())', []);

          // nested function
          await expectErrors('FROM a_index | EVAL TEST(RETURNS_INTEGER())', []);

          // inline cast
          await expectErrors('FROM a_index | EVAL TEST(1.::INT)', []);

          // field
          await expectErrors('FROM a_index | EVAL TEST(integerField)', []);
          await expectErrors('FROM a_index | EVAL TEST(dateField)', []);

          // userDefinedColumns
          await expectErrors('FROM a_index | EVAL col1 = 1 | EVAL TEST(col1)', []);
          await expectErrors('FROM a_index | EVAL col1 = NOW() | EVAL TEST(col1)', []);

          // multiple instances
          await expectErrors('FROM a_index | EVAL TEST(1) | EVAL TEST(1)', []);
        });

        it('rejects arguments of an incorrect type', async () => {
          const { expectErrors } = await setup();

          // straight call
          await expectErrors('FROM a_index | EVAL TEST(1.1)', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // assignment
          await expectErrors('FROM a_index | EVAL var = TEST(1.1)', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // nested function
          await expectErrors('FROM a_index | EVAL TEST(RETURNS_DOUBLE())', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // inline cast
          await expectErrors('FROM a_index | EVAL TEST(1::DOUBLE)', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // field
          await expectErrors('FROM a_index | EVAL TEST(doubleField)', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // userDefinedColumns
          await expectErrors('FROM a_index | EVAL col1 = 1. | EVAL TEST(col1)', [
            getNoValidCallSignatureError('test', ['double']),
          ]);

          // multiple instances
          await expectErrors('FROM a_index | EVAL TEST(1.1) | EVAL TEST(1.1)', [
            getNoValidCallSignatureError('test', ['double']),
            getNoValidCallSignatureError('test', ['double']),
          ]);
        });

        it('accepts nulls by default', async () => {
          const { expectErrors } = await setup();
          await expectErrors('FROM a_index | EVAL TEST(NULL)', []);
        });
      });

      describe('special scenarios', () => {
        it('any type', async () => {
          const testFn: FunctionDefinition = {
            name: 'test',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'any' }],
                returnType: 'integer',
              },
            ],
          };

          setTestFunctions([testFn]);

          const { expectErrors } = await setup();

          await expectErrors('FROM a_index | EVAL TEST(1)', []);
          await expectErrors('FROM a_index | EVAL TEST("keyword")', []);
          await expectErrors('FROM a_index | EVAL TEST(2.)', []);
          await expectErrors('FROM a_index | EVAL TEST(to_cartesianpoint(""))', []);
          await expectErrors('FROM a_index | EVAL TEST(NOW())', []);
        });

        it('list type', async () => {
          const testFn: FunctionDefinition = {
            name: 'in',
            type: FunctionDefinitionTypes.OPERATOR,
            description: '',
            locationsAvailable: [Location.ROW],
            signatures: [
              {
                params: [
                  { name: 'arg1', type: 'keyword' },
                  { name: 'arg2', type: 'keyword[]' },
                ],
                returnType: 'boolean',
              },
            ],
          };

          setTestFunctions([testFn]);

          const { expectErrors } = await setup();

          await expectErrors('ROW "a" IN ("a", "b", "c")', []);
          await expectErrors('ROW "a" IN (1, 2)', [
            getNoValidCallSignatureError('in', ['keyword', 'integer']), // @TODO look at reporting array type
          ]);
        });

        describe('implicit string casting', () => {
          it.each(PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING)(
            'accepts string arguments for %s',
            async (paramType) => {
              setTestFunctions([
                {
                  name: 'test',
                  type: FunctionDefinitionTypes.SCALAR,
                  description: '',
                  locationsAvailable: [Location.EVAL],
                  signatures: [
                    {
                      params: [{ name: 'arg1', type: paramType }],
                      returnType: 'date',
                    },
                  ],
                },
              ]);

              const { expectErrors } = await setup();

              await expectErrors('FROM a_index | EVAL TEST("")', []);
            }
          );
        });

        it('treats text and keyword as interchangeable', async () => {
          setTestFunctions([
            {
              name: 'accepts_text',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [{ name: 'arg1', type: 'text' }],
                  returnType: 'keyword',
                },
              ],
            },
            {
              name: 'accepts_keyword',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [{ name: 'arg1', type: 'keyword' }],
                  returnType: 'keyword',
                },
              ],
            },
            {
              name: 'returns_keyword',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [],
                  returnType: 'keyword',
                },
              ],
            },
          ]);

          const { expectErrors } = await setup();

          // literals — all string literals are keywords
          await expectErrors('FROM a_index | EVAL ACCEPTS_TEXT("keyword literal")', []);

          // fields
          await expectErrors('FROM a_index | EVAL ACCEPTS_KEYWORD(textField)', []);
          await expectErrors('FROM a_index | EVAL ACCEPTS_TEXT(keywordField)', []);

          // functions
          // no need to test a function that returns text, because they no longer exist: https://github.com/elastic/elasticsearch/pull/114334
          await expectErrors('FROM a_index | EVAL ACCEPTS_TEXT(RETURNS_KEYWORD())', []);
        });

        it('detects a missing column', async () => {
          setTestFunctions([
            {
              name: 'test',
              type: FunctionDefinitionTypes.SCALAR,
              description: '',
              locationsAvailable: [Location.EVAL],
              signatures: [
                {
                  params: [{ name: 'arg1', type: 'keyword' }],
                  returnType: 'keyword',
                },
              ],
            },
          ]);

          const { expectErrors } = await setup();

          await expectErrors('FROM a_index | EVAL TEST(missingColumn)', [
            'Unknown column "missingColumn"',
          ]);

          await expectErrors('FROM a_index | EVAL foo=missingColumn', [
            'Unknown column "missingColumn"',
          ]);
        });

        describe('inline casts', () => {
          it('validates a nested function within an inline cast', async () => {
            setTestFunctions([
              {
                name: 'test',
                type: FunctionDefinitionTypes.SCALAR,
                description: '',
                locationsAvailable: [Location.EVAL],
                signatures: [
                  {
                    params: [{ name: 'arg1', type: 'integer' }],
                    returnType: 'integer',
                  },
                ],
              },
            ]);

            const { expectErrors } = await setup();

            await expectErrors('FROM a_index | EVAL TEST(TEST("")::integer)', [
              getNoValidCallSignatureError('test', ['keyword']),
            ]);
            // deep nesting
            await expectErrors('FROM a_index | EVAL TEST(TEST("")::double::keyword::integer)', [
              getNoValidCallSignatureError('test', ['keyword']),
            ]);
          });

          it.skip('validates a top-level function within an inline cast', async () => {
            setTestFunctions([
              {
                name: 'test',
                type: FunctionDefinitionTypes.SCALAR,
                description: '',
                locationsAvailable: [Location.EVAL],
                signatures: [
                  {
                    params: [{ name: 'arg1', type: 'integer' }],
                    returnType: 'integer',
                  },
                ],
              },
            ]);

            const { expectErrors } = await setup();

            await expectErrors('FROM a_index | EVAL TEST("")::cartesian_point', [
              getNoValidCallSignatureError('test', ['keyword']),
            ]);
          });

          // This test may seem obvious, but it is here to guard against
          // erroring because we are checking the types of signatures that
          // haven't yet been correctly filtered by arity, which leads to
          // a thrown error and no validation error message
          it('correctly handles signatures of different lengths', async () => {
            setTestFunctions([
              {
                name: 'test',
                type: FunctionDefinitionTypes.SCALAR,
                description: '',
                locationsAvailable: [Location.EVAL],
                signatures: [
                  // the order of these signatures is important.
                  // the shorter one is first so that if they aren't
                  // filtered down properly, the 2 arguments in the invocation
                  // will run off the 1 argument signature
                  {
                    params: [{ name: 'arg1', type: 'keyword' }],
                    returnType: 'keyword',
                  },
                  {
                    params: [
                      { name: 'arg1', type: 'integer' },
                      { name: 'arg2', type: 'integer' },
                    ],
                    returnType: 'integer',
                  },
                ],
              },
            ]);

            const { expectErrors } = await setup();

            await expectErrors('FROM a_index | EVAL TEST("", "")', [
              getNoValidCallSignatureError('test', ['keyword', 'keyword']),
            ]);
          });
        });

        it('skips column validation for left assignment arg', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM a_index | EVAL lolz = 2', []);
          await expectErrors('FROM a_index | EVAL lolz = nonexistent', [
            'Unknown column "nonexistent"',
          ]);
        });

        it('skips column validation for right arg to AS', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM a_index | RENAME keywordField AS lolz', []);
          await expectErrors('FROM a_index | RENAME nonexistent AS lolz', [
            'Unknown column "nonexistent"',
          ]);
        });
      });
    });

    it('validates argument count (arity)', async () => {
      const testFns: FunctionDefinition[] = [
        {
          name: 'test',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword' }],
              returnType: 'keyword',
            },
            {
              params: [
                { name: 'arg1', type: 'integer' },
                { name: 'arg2', type: 'integer' },
              ],
              returnType: 'integer',
            },
            {
              params: [
                { name: 'arg1', type: 'integer' },
                { name: 'arg2', type: 'integer' },
                { name: 'arg3', type: 'integer' },
              ],
              returnType: 'integer',
            },
          ],
        },
        {
          name: 'expects_1_arg_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'integer' }],
              returnType: 'integer',
            },
          ],
        },
        {
          name: 'expects_2_args_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'integer' },
                { name: 'arg2', type: 'integer' },
              ],
              returnType: 'integer',
            },
          ],
        },
        {
          name: 'variadic_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'integer' }],
              minParams: 2,
              returnType: 'integer',
            },
          ],
        },
      ];

      setTestFunctions(testFns);

      const { expectErrors } = await setup();

      // several signatures, different arities
      await expectErrors('FROM a_index | EVAL TEST()', [
        'TEST expected 1, 2, or 3 arguments, but got 0.',
      ]);
      await expectErrors('FROM a_index | EVAL TEST(1, 1, 1, 1)', [
        'TEST expected 1, 2, or 3 arguments, but got 4.',
      ]);

      // exact number of arguments
      await expectErrors('FROM a_index | EVAL EXPECTS_1_ARG_FN(1, 1, 2)', [
        'EXPECTS_1_ARG_FN expected one argument, but got 3.',
      ]);

      await expectErrors('FROM a_index | EVAL EXPECTS_2_ARGS_FN(1, 1, 2)', [
        'EXPECTS_2_ARGS_FN expected 2 arguments, but got 3.',
      ]);

      // minimum number of arguments
      await expectErrors(`FROM a_index | EVAL VARIADIC_FN(1)`, [
        'VARIADIC_FN expected at least 2 arguments, but got 1.',
      ]);
      await expectErrors(
        `FROM a_index | EVAL VARIADIC_FN(${new Array(100).fill(1).join(', ')})`,
        []
      );
    });

    it('allows for optional arguments', async () => {
      const testFns: FunctionDefinition[] = [
        {
          name: 'test',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'keyword' },
                { name: 'arg2', type: 'keyword', optional: true },
              ],
              returnType: 'keyword',
            },
          ],
        },
      ];

      setTestFunctions(testFns);

      const { expectErrors } = await setup();

      await expectErrors('FROM a_index | EVAL TEST("")', []);
      await expectErrors('FROM a_index | EVAL TEST("", "")', []);
    });

    describe('values of unknown type', () => {
      it('doesnt validate user-defined columns of type unknown', async () => {
        setTestFunctions([
          {
            name: 'test1',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'test2',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'test3',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'long' }],
                returnType: 'keyword',
              },
            ],
          },
        ]);

        const { validate } = await setup();
        const errors = (
          await validate(
            `FROM a_index
        | EVAL foo = TEST1(1.) // creates foo as unknown value
        | EVAL TEST2(foo) // shouldn't error, foo is unknown
        | EVAL TEST3(foo) // shouldn't error, foo is unknown`
          )
        ).errors;

        expect(errors).toHaveLength(1);
      });
    });

    describe('nested functions', () => {
      it('supports deep nesting', async () => {
        setTestFunctions([
          {
            name: 'test',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'integer',
              },
            ],
          },
          {
            name: 'test2',
            type: FunctionDefinitionTypes.SCALAR,
            description: '',
            locationsAvailable: [Location.EVAL],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'integer' }],
                returnType: 'keyword',
              },
            ],
          },
        ]);

        const { expectErrors } = await setup();

        await expectErrors('FROM a_index | EVAL TEST(TEST2(TEST(TEST2(1))))', []);
      });

      // @TODO — test function aliases
    });
  });

  describe('checks locations allowed', () => {
    it('validates command support', async () => {
      setTestFunctions([
        {
          name: 'eval_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'stats_fn',
          type: FunctionDefinitionTypes.AGG,
          description: '',
          locationsAvailable: [Location.STATS],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'row_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.ROW],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'where_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.WHERE],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'sort_fn',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.SORT],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();

      await expectErrors('FROM a_index | EVAL EVAL_FN()', []);
      await expectErrors('FROM a_index | SORT SORT_FN()', []);
      await expectErrors('FROM a_index | STATS max(doubleField)', []);
      await expectErrors('ROW ROW_FN()', []);
      await expectErrors('FROM a_index | WHERE WHERE_FN()', []);

      await expectErrors('FROM a_index | EVAL SORT_FN()', ['Function SORT_FN not allowed in EVAL']);
      await expectErrors('FROM a_index | SORT STATS_FN()', [
        'Function STATS_FN not allowed in SORT',
      ]);
      await expectErrors('FROM a_index | STATS ROW_FN()', ['Function ROW_FN not allowed in STATS']);
      await expectErrors('ROW WHERE_FN()', ['Function WHERE_FN not allowed in ROW']);
      await expectErrors('FROM a_index | WHERE EVAL_FN()', [
        'Function EVAL_FN not allowed in WHERE',
      ]);
    });

    it('validates option support', async () => {
      setTestFunctions([
        {
          name: 'supports_by_option',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL, Location.STATS_BY],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'does_not_support_by_option',
          type: FunctionDefinitionTypes.SCALAR,
          description: '',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },

        {
          name: 'agg_fn',
          type: FunctionDefinitionTypes.AGG,
          description: '',
          locationsAvailable: [Location.STATS],
          signatures: [
            {
              params: [],
              returnType: 'keyword',
            },
          ],
        },
      ]);
      const { expectErrors } = await setup();
      await expectErrors('FROM a_index | STATS AGG_FN() BY SUPPORTS_BY_OPTION()', []);
      await expectErrors('FROM a_index | STATS AGG_FN() BY DOES_NOT_SUPPORT_BY_OPTION()', [
        'Function DOES_NOT_SUPPORT_BY_OPTION not allowed in BY',
      ]);
    });

    it('validates timeseries function locations', async () => {
      setTestFunctions([
        {
          name: 'ts_function',
          type: FunctionDefinitionTypes.TIME_SERIES_AGG,
          description: '',
          locationsAvailable: [Location.STATS_TIMESERIES],
          signatures: [
            {
              params: [],
              returnType: 'double',
            },
          ],
        },
        {
          name: 'agg_function',
          type: FunctionDefinitionTypes.AGG,
          description: '',
          locationsAvailable: [Location.STATS],
          signatures: [
            {
              params: [{ name: 'field', type: 'double', optional: false }],
              returnType: 'keyword',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();

      await expectErrors('TS a_index | STATS AGG_FUNCTION(TS_FUNCTION())', []);
      await expectErrors('FROM a_index | STATS AGG_FUNCTION(TS_FUNCTION())', [
        'Function TS_FUNCTION not allowed in STATS',
      ]);

      // TIME_SERIES_AGG functions are also allowed at the top level of STATS with TS source
      await expectErrors('TS a_index | STATS TS_FUNCTION()', []);
      await expectErrors('FROM a_index | STATS TS_FUNCTION()', [
        'Function TS_FUNCTION not allowed in STATS',
      ]);
    });
  });

  it('should flag nested aggregation functions', async () => {
    setTestFunctions([
      {
        name: 'agg_function_1',
        type: FunctionDefinitionTypes.AGG,
        description: '',
        locationsAvailable: [Location.STATS],
        signatures: [
          {
            params: [{ name: 'field', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
        ],
      },
      {
        name: 'scalar_function',
        type: FunctionDefinitionTypes.SCALAR,
        description: '',
        locationsAvailable: [Location.STATS],
        signatures: [
          {
            params: [{ name: 'field', type: 'keyword', optional: false }],
            returnType: 'keyword',
          },
        ],
      },
      {
        name: 'agg_function_2',
        type: FunctionDefinitionTypes.AGG,
        description: '',
        locationsAvailable: [Location.STATS],
        signatures: [
          {
            params: [],
            returnType: 'keyword',
          },
        ],
      },
    ]);

    const { expectErrors } = await setup();

    await expectErrors('FROM a_index | STATS AGG_FUNCTION_1(AGG_FUNCTION_2())', [
      'Aggregation functions cannot be nested. Found AGG_FUNCTION_2 in AGG_FUNCTION_1.',
    ]);

    await expectErrors('FROM a_index | STATS AGG_FUNCTION_1(SCALAR_FUNCTION(AGG_FUNCTION_2()))', [
      'Aggregation functions cannot be nested. Found AGG_FUNCTION_2 in AGG_FUNCTION_1.',
    ]);
  });

  it('should ignore a function whose name is defined by a parameter', async () => {
    const { expectErrors } = await setup();

    await expectErrors('FROM a_index | EVAL ??param(arg1)', []);
  });

  describe('License-based validation', () => {
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
          locationsAvailable: [Location.STATS, Location.STATS_BY],
          license: 'platinum',
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
          locationsAvailable: [Location.STATS, Location.STATS_BY],
        },
      ]);
    });

    describe('function-level licensing', () => {
      it('should allow licensed function when license IS available', async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => true,
        }));

        await expectErrors(
          'FROM a_index | STATS col0 = AVG(doubleField) BY PLATINUM_FUNCTION_MOCK(keywordField)',
          []
        );
      });

      it('should disallow licensed function when license NOT available', async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => false,
        }));

        await expectErrors(
          'FROM a_index | STATS col0 = AVG(doubleField) BY PLATINUM_FUNCTION_MOCK()',
          [
            'PLATINUM_FUNCTION_MOCK requires a PLATINUM license.',
            'PLATINUM_FUNCTION_MOCK expected one argument, but got 0.',
          ]
        );

        await expectErrors(
          'FROM a_index | STATS col0 = AVG(doubleField) BY PLATINUM_FUNCTION_MOCK(keywordField)',
          ['PLATINUM_FUNCTION_MOCK requires a PLATINUM license.']
        );

        await expectErrors('FROM a_index | STATS col0 = PLATINUM_FUNCTION_MOCK(keywordField)', [
          'PLATINUM_FUNCTION_MOCK requires a PLATINUM license.',
        ]);
      });

      it('should show license error even when nested functions also have errors', async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => false,
        }));

        await expectErrors('FROM index | STATS extent = PLATINUM_FUNCTION_MOCK(FLOOR(""))', [
          'PLATINUM_FUNCTION_MOCK requires a PLATINUM license.',
          getNoValidCallSignatureError('floor', ['keyword']),
        ]);
      });
    });

    describe('signature-level licensing', () => {
      it('should allow licensed signature when license IS available', async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => true,
        }));

        await expectErrors(
          'FROM index | STATS extent = PLATINUM_PARTIAL_FUNCTION_MOCK(TO_CARTESIANSHAPE("0,0"))',
          []
        );
      });

      it('should allow ambiguous invocation when it could match an available signature', async () => {
        setTestFunctions([
          {
            type: FunctionDefinitionTypes.SCALAR,
            name: 'test',
            description: '',
            signatures: [
              {
                params: [
                  {
                    name: 'field',
                    type: 'integer',
                    optional: false,
                  },
                ],
                license: 'platinum', // licensed signature
                returnType: 'keyword',
              },
              {
                params: [
                  {
                    name: 'field',
                    type: 'keyword',
                    optional: false,
                  },
                ],
                license: undefined, // no license required
                returnType: 'keyword',
              },
            ],
            locationsAvailable: [Location.EVAL],
          },
        ]);

        const { expectErrors, callbacks } = await setup();

        // make license unavailable
        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => false,
        }));

        // make ambiguous call using a parameter "?param" that could match either signature
        await expectErrors('FROM index | EVAL extent = TEST(?param)', []);
      });

      it('should disallow licensed signature when license NOT available', async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => false,
        }));

        await expectErrors(
          'FROM index | STATS extent = PLATINUM_PARTIAL_FUNCTION_MOCK(TO_CARTESIANSHAPE("0,0"))',
          [
            "PLATINUM_PARTIAL_FUNCTION_MOCK with 'field' of type 'cartesian_shape' requires a PLATINUM license.",
          ]
        );
      });

      it("Should report various non-license errors even when the function isn't allowed", async () => {
        const { expectErrors, callbacks } = await setup();

        callbacks.getLicense = jest.fn(async () => ({
          hasAtLeast: () => false,
        }));

        await expectErrors('FROM index | STATS result = PLATINUM_PARTIAL_FUNCTION_MOCK()', [
          'PLATINUM_PARTIAL_FUNCTION_MOCK expected one argument, but got 0.',
        ]);

        await expectErrors('FROM index | STATS result = PLATINUM_PARTIAL_FUNCTION_MOCK(0)', [
          getNoValidCallSignatureError('platinum_partial_function_mock', ['integer']),
        ]);

        await expectErrors(
          'FROM index | STATS result = PLATINUM_PARTIAL_FUNCTION_MOCK(WrongField)',
          ['Unknown column "WrongField"']
        );
      });

      describe('operators in STATS WHERE context', () => {
        it('should allow IS NOT NULL operator in STATS WHERE clause when validation is applied', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM index | STATS COUNT() WHERE unknownField IS NOT NULL', [
            'Unknown column "unknownField"',
          ]);
        });
      });
    });
  });

  describe('conditional function validation', () => {
    beforeEach(() => {
      const definitions: FunctionDefinition[] = [
        {
          name: 'conditional_mock',
          type: FunctionDefinitionTypes.SCALAR,
          description: 'Mock function with isSignatureRepeating',
          locationsAvailable: [Location.EVAL],
          signatures: [
            {
              params: [
                { name: 'condition', type: 'boolean' },
                { name: 'value', type: 'any' },
              ],
              returnType: 'unknown',
              minParams: 2,
              isSignatureRepeating: true,
            },
          ],
        },
      ];

      setTestFunctions(definitions);
    });

    it('accepts compatible value types (text + keyword)', async () => {
      const { expectErrors } = await setup();

      await expectErrors(
        'FROM index | EVAL result = CONDITIONAL_MOCK(booleanField, textField, booleanField, keywordField)',
        []
      );
    });

    it('rejects incompatible value types', async () => {
      const { expectErrors } = await setup();

      await expectErrors(
        'FROM index | EVAL result = CONDITIONAL_MOCK(booleanField, longField, booleanField, "d")',
        [
          getNoValidCallSignatureError('conditional_mock', [
            'boolean',
            'long',
            'boolean',
            'keyword',
          ]),
        ]
      );
    });

    it('rejects string literal at condition position', async () => {
      const { expectErrors } = await setup();

      await expectErrors('FROM index | EVAL result = CONDITIONAL_MOCK("string", keywordField)', [
        getNoValidCallSignatureError('conditional_mock', ['keyword', 'keyword']),
      ]);
    });
  });
});
