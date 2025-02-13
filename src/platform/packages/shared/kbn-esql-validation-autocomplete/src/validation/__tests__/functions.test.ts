/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FunctionDefinition } from '../../definitions/types';
import { setTestFunctions } from '../../shared/test_functions';
import { setup } from './helpers';

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
              type: 'scalar',
              description: '',
              supportedCommands: ['eval'],
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
              type: 'scalar',
              description: '',
              supportedCommands: ['eval'],
              signatures: [
                {
                  params: [],
                  returnType: 'integer',
                },
              ],
            },
            {
              name: 'returns_double',
              type: 'scalar',
              description: '',
              supportedCommands: ['eval'],
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

          // variables
          await expectErrors('FROM a_index | EVAL var1 = 1 | EVAL TEST(var1)', []);
          await expectErrors('FROM a_index | EVAL var1 = NOW() | EVAL TEST(var1)', []);

          // multiple instances
          await expectErrors('FROM a_index | EVAL TEST(1) | EVAL TEST(1)', []);
        });

        it('rejects arguments of an incorrect type', async () => {
          const { expectErrors } = await setup();

          // straight call
          await expectErrors('FROM a_index | EVAL TEST(1.1)', [
            'Argument of [test] must be [integer], found value [1.1] type [double]',
          ]);

          // assignment
          await expectErrors('FROM a_index | EVAL var = TEST(1.1)', [
            'Argument of [test] must be [integer], found value [1.1] type [double]',
          ]);

          // nested function
          await expectErrors('FROM a_index | EVAL TEST(RETURNS_DOUBLE())', [
            'Argument of [test] must be [integer], found value [RETURNS_DOUBLE()] type [double]',
          ]);

          // inline cast
          await expectErrors('FROM a_index | EVAL TEST(1::DOUBLE)', [
            'Argument of [test] must be [integer], found value [1::DOUBLE] type [double]',
          ]);

          // field
          await expectErrors('FROM a_index | EVAL TEST(doubleField)', [
            'Argument of [test] must be [integer], found value [doubleField] type [double]',
          ]);

          // variables
          await expectErrors('FROM a_index | EVAL var1 = 1. | EVAL TEST(var1)', [
            'Argument of [test] must be [integer], found value [var1] type [double]',
          ]);

          // multiple instances
          await expectErrors('FROM a_index | EVAL TEST(1.1) | EVAL TEST(1.1)', [
            'Argument of [test] must be [integer], found value [1.1] type [double]',
            'Argument of [test] must be [integer], found value [1.1] type [double]',
          ]);
        });

        it('accepts nulls by default', async () => {
          const { expectErrors } = await setup();
          expectErrors('FROM a_index | EVAL TEST(NULL)', []);
        });
      });

      describe('special parameter types', () => {
        it('any type', async () => {
          const testFn: FunctionDefinition = {
            name: 'test',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
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
            type: 'builtin',
            description: '',
            supportedCommands: ['row'],
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
          await expectErrors('ROW "a" IN (1, "b", "c")', [
            'Argument of [in] must be [keyword[]], found value [(1, "b", "c")] type [(integer, keyword, keyword)]',
          ]);
        });
      });

      it('checks types by signature', async () => {
        const testFn: FunctionDefinition = {
          name: 'test',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'double' },
                { name: 'arg2', type: 'double' },
                { name: 'arg3', type: 'double' },
              ],
              returnType: 'double',
            },
            {
              params: [
                { name: 'arg1', type: 'keyword' },
                { name: 'arg2', type: 'keyword' },
              ],
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
              params: [{ name: 'arg1', type: 'date' }],
              returnType: 'date',
            },
          ],
        };

        setTestFunctions([testFn]);

        const { expectErrors } = await setup();

        // double, double, double
        await expectErrors('FROM a_index | EVAL TEST(1., 1., 1.)', []);
        await expectErrors('FROM a_index | EVAL TEST("", "", "")', [
          'Argument of [test] must be [double], found value [""] type [keyword]',
          'Argument of [test] must be [double], found value [""] type [keyword]',
          'Argument of [test] must be [double], found value [""] type [keyword]',
        ]);

        // int, int
        await expectErrors('FROM a_index | EVAL TEST(1, 1)', []);
        await expectErrors('FROM a_index | EVAL TEST(1, "")', [
          // @TODO this message should respect the type of the first argument
          // see https://github.com/elastic/kibana/issues/180518
          'Argument of [test] must be [keyword], found value [1] type [integer]',
        ]);

        // keyword, keyword
        await expectErrors('FROM a_index | EVAL TEST("", "")', []);
        await expectErrors('FROM a_index | EVAL TEST("", 1)', [
          'Argument of [test] must be [keyword], found value [1] type [integer]',
        ]);

        // date
        await expectErrors('FROM a_index | EVAL TEST(NOW())', []);
        await expectErrors('FROM a_index | EVAL TEST(1.)', [
          'Argument of [test] must be [date], found value [1.] type [double]',
        ]);
      });
    });

    it('validates argument count (arity)', async () => {
      const testFns: FunctionDefinition[] = [
        {
          name: 'test',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
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
          ],
        },
        {
          name: 'variadic_fn',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
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

      await expectErrors('FROM a_index | EVAL TEST()', [
        'Error: [test] function expects at least one argument, got 0.',
      ]);
      await expectErrors('FROM a_index | EVAL TEST(1, 1, 1)', [
        'Error: [test] function expects no more than 2 arguments, got 3.',
      ]);

      // variadic
      await expectErrors(`FROM a_index | EVAL VARIADIC_FN(1)`, [
        // @TODO this is an incorrect error message
        'Error: [variadic_fn] function expects one argument, got 1.',
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
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
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

    it('validates "all" parameter (wildcard)', async () => {
      setTestFunctions([
        {
          name: 'supports_all',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword', supportsWildcard: true }],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'does_not_support_all',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword', supportsWildcard: false }],
              returnType: 'keyword',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();

      await expectErrors('FROM a_index | EVAL SUPPORTS_ALL(*)', []);
      await expectErrors('FROM a_index | EVAL SUPPORTS_ALL(*, "")', [
        // It may seem strange that these are syntax errors, but the grammar actually doesn't allow
        // for a function to support the asterisk and have additional arguments. Testing it here so we'll
        // be notified if that changes.
        `SyntaxError: extraneous input ')' expecting <EOF>`,
        `SyntaxError: no viable alternative at input 'SUPPORTS_ALL(*,'`,
      ]);
      await expectErrors('FROM a_index | EVAL DOES_NOT_SUPPORT_ALL(*)', [
        'Using wildcards (*) in does_not_support_all is not allowed',
      ]);
    });

    it('casts string arguments to dates', async () => {
      setTestFunctions([
        {
          name: 'test',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'date' },
                { name: 'arg2', type: 'date' },
              ],
              returnType: 'date',
            },
            {
              params: [
                { name: 'arg1', type: 'integer' },
                { name: 'arg2', type: 'integer' },
              ],
              returnType: 'date',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();

      await expectErrors('FROM a_index | EVAL TEST("2024-09-09", "2024-09-09")', []);
    });

    it('enforces constant-only parameters', async () => {
      setTestFunctions([
        {
          name: 'test',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'integer', constantOnly: true }],
              returnType: 'integer',
            },
          ],
        },
        {
          name: 'test2',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [
                { name: 'arg1', type: 'integer' },
                { name: 'arg2', type: 'date', constantOnly: true },
              ],
              returnType: 'integer',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();
      await expectErrors('FROM a_index | EVAL TEST(1)', []);
      // operators, functions are ok
      await expectErrors('FROM a_index | EVAL TEST(1 + 1)', []);
      await expectErrors('FROM a_index | EVAL TEST(integerField)', [
        'Argument of [test] must be a constant, received [integerField]',
      ]);
      await expectErrors('FROM a_index | EVAL var = 10 | EVAL TEST(var)', [
        'Argument of [test] must be a constant, received [var]',
      ]);

      await expectErrors('FROM a_index | EVAL TEST2(integerField, NOW())', []);
      await expectErrors('FROM a_index | EVAL TEST2(integerField, dateField)', [
        'Argument of [test2] must be a constant, received [dateField]',
      ]);
    });

    it('validates accepted values', async () => {
      setTestFunctions([
        {
          name: 'test',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword', acceptedValues: ['ASC', 'DESC'] }],
              returnType: 'keyword',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();
      await expectErrors('FROM a_index | EVAL TEST("ASC")', [], []);
      await expectErrors('FROM a_index | EVAL TEST("DESC")', [], []);

      // case-insensitive
      await expectErrors('FROM a_index | EVAL TEST("aSc")', [], []);
      await expectErrors('FROM a_index | EVAL TEST("DesC")', [], []);

      // not constantOnly, so field is accepted
      await expectErrors('FROM a_index | EVAL TEST(keywordField)', [], []);

      await expectErrors(
        'FROM a_index | EVAL TEST("foo")',
        [],
        ['Invalid option ["foo"] for test. Supported options: ["ASC", "DESC"].']
      );
    });

    it('validates values of type unknown', async () => {
      setTestFunctions([
        {
          name: 'test1',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword' }],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'test2',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'keyword' }],
              returnType: 'keyword',
            },
          ],
        },
        {
          name: 'test3',
          type: 'scalar',
          description: '',
          supportedCommands: ['eval'],
          signatures: [
            {
              params: [{ name: 'arg1', type: 'long' }],
              returnType: 'keyword',
            },
          ],
        },
      ]);

      const { expectErrors } = await setup();
      await expectErrors(
        `FROM a_index
        | EVAL foo = TEST1(1.)
        | EVAL TEST2(foo)
        | EVAL TEST3(foo)`,
        ['Argument of [test1] must be [keyword], found value [1.] type [double]']
      );
    });

    describe('command/option support', () => {
      it('validates command support', async () => {
        setTestFunctions([
          {
            name: 'eval_fn',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'stats_fn',
            type: 'agg',
            description: '',
            supportedCommands: ['stats'],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'row_fn',
            type: 'scalar',
            description: '',
            supportedCommands: ['row'],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'where_fn',
            type: 'scalar',
            description: '',
            supportedCommands: ['where'],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'sort_fn',
            type: 'scalar',
            description: '',
            supportedCommands: ['sort'],
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
        await expectErrors('FROM a_index | STATS STATS_FN()', []);
        await expectErrors('ROW ROW_FN()', []);
        await expectErrors('FROM a_index | WHERE WHERE_FN()', []);

        await expectErrors('FROM a_index | EVAL SORT_FN()', [
          'EVAL does not support function sort_fn',
        ]);
        await expectErrors('FROM a_index | SORT STATS_FN()', [
          'SORT does not support function stats_fn',
        ]);
        await expectErrors('FROM a_index | STATS ROW_FN()', [
          'At least one aggregation function required in [STATS], found [ROW_FN()]',
          'STATS does not support function row_fn',
        ]);
        await expectErrors('ROW WHERE_FN()', ['ROW does not support function where_fn']);
        await expectErrors('FROM a_index | WHERE EVAL_FN()', [
          'WHERE does not support function eval_fn',
        ]);
      });

      it('validates option support', async () => {
        setTestFunctions([
          {
            name: 'supports_by_option',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
            supportedOptions: ['by'],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'does_not_support_by_option',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
            supportedOptions: [],
            signatures: [
              {
                params: [],
                returnType: 'keyword',
              },
            ],
          },

          {
            name: 'agg_fn',
            type: 'agg',
            description: '',
            supportedCommands: ['stats'],
            supportedOptions: [],
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
          'STATS BY does not support function does_not_support_by_option',
        ]);
      });
    });

    describe('nested functions', () => {
      it('supports deep nesting', async () => {
        setTestFunctions([
          {
            name: 'test',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'integer',
              },
            ],
          },
          {
            name: 'test2',
            type: 'scalar',
            description: '',
            supportedCommands: ['eval'],
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

      it("doesn't allow nested aggregation functions", async () => {
        setTestFunctions([
          {
            name: 'agg_fn',
            type: 'agg',
            description: '',
            supportedCommands: ['stats'],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'keyword',
              },
            ],
          },
          {
            name: 'scalar_fn',
            type: 'scalar',
            description: '',
            supportedCommands: ['stats'],
            signatures: [
              {
                params: [{ name: 'arg1', type: 'keyword' }],
                returnType: 'keyword',
              },
            ],
          },
        ]);

        const { expectErrors } = await setup();

        await expectErrors('FROM a_index | STATS AGG_FN(AGG_FN(""))', [
          'Aggregate function\'s parameters must be an attribute, literal or a non-aggregation function; found [AGG_FN("")] of type [keyword]',
        ]);
        // @TODO — enable this test when we have fixed this bug
        // await expectErrors('FROM a_index | STATS AGG_FN(SCALAR_FN(AGG_FN("")))', [
        //   'No nested aggregation functions.',
        // ]);
      });

      // @TODO — test function aliases
    });
  });
});
