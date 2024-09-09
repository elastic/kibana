/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
              type: 'eval',
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
              type: 'eval',
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
              type: 'eval',
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
            'Argument of [test] must be [integer], found value [1.1] type [decimal]',
          ]);

          // assignment
          await expectErrors('FROM a_index | EVAL var = TEST(1.1)', [
            'Argument of [test] must be [integer], found value [1.1] type [decimal]',
          ]);

          // nested function
          await expectErrors('FROM a_index | EVAL TEST(RETURNS_DOUBLE())', [
            'Argument of [test] must be [integer], found value [RETURNS_DOUBLE()] type [double]',
          ]);

          // inline cast
          await expectErrors('FROM a_index | EVAL TEST(1::DOUBLE)', [
            'Argument of [test] must be [integer], found value [1::DOUBLE] type [DOUBLE]',
          ]);

          // field
          await expectErrors('FROM a_index | EVAL TEST(doubleField)', [
            'Argument of [test] must be [integer], found value [doubleField] type [double]',
          ]);

          // variables
          await expectErrors('FROM a_index | EVAL var1 = 1. | EVAL TEST(var1)', [
            'Argument of [test] must be [integer], found value [var1] type [decimal]',
          ]);

          // multiple instances
          await expectErrors('FROM a_index | EVAL TEST(1.1) | EVAL TEST(1.1)', [
            'Argument of [test] must be [integer], found value [1.1] type [decimal]',
            'Argument of [test] must be [integer], found value [1.1] type [decimal]',
          ]);
        });

        it('accepts nulls by default', async () => {
          const { expectErrors } = await setup();
          expectErrors('FROM a_index | EVAL TEST(NULL)', []);
        });
      });

      it('checks types by signature', async () => {
        const testFn: FunctionDefinition = {
          name: 'test',
          type: 'eval',
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
          'Argument of [test] must be [double], found value [""] type [string]',
          'Argument of [test] must be [double], found value [""] type [string]',
          'Argument of [test] must be [double], found value [""] type [string]',
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
          'Argument of [test] must be [date], found value [1] type [decimal]',
        ]);
      });
    });

    it('validates argument count (arity)', async () => {
      const testFns: FunctionDefinition[] = [
        {
          name: 'test',
          type: 'eval',
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
          type: 'eval',
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

    it('validates "all" parameter (wildcard)', async () => {
      setTestFunctions([
        {
          name: 'supports_all',
          type: 'eval',
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
          type: 'eval',
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
        // It may seeem strange that these are syntax errors, but the grammar actually doesn't allow
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
          type: 'eval',
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

    it('enforces constant-only parameters', () => {
      // testErrorsAndWarnings('from a_index | stats percentile(doubleField, doubleField)', [
      //   'Argument of [percentile] must be a constant, received [doubleField]',
      // ]);
      // testErrorsAndWarnings(
      //   'from a_index | stats var = round(percentile(doubleField, doubleField))',
      //   [
      //     'Argument of [=] must be a constant, received [round(percentile(doubleField,doubleField))]',
      //   ]
      // );
    });
  });

  describe('command support', () => {
    it('does not allow aggregations outside of STATS', () => {
      // SORT
      // WHERE
      // EVAL
    });
    it('allows scalar functions in all contexts', () => {
      // SORT
      // WHERE
      // EVAL
      // STATS
      // ROW
    });
  });

  describe('nested functions', () => {
    it('supports deep nesting', () => {});
    it("doesn't allow nested aggregation functions", () => {});
  });
});
