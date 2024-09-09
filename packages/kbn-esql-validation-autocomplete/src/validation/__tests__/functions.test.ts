/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FunctionDefinition } from '../../definitions/types';
import { setDynamicFunctions } from '../../shared/dynamic_functions';
import { setup } from './helpers';

describe('function validation', () => {
  afterEach(() => {
    setDynamicFunctions([]);
  });

  describe('parameter validation', () => {
    describe('type validation', () => {
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

        setDynamicFunctions(definitions);
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

        // // variables
        await expectErrors('FROM a_index | EVAL var1 = 1. | EVAL TEST(var1)', [
          'Argument of [test] must be [integer], found value [var1] type [decimal]',
        ]);
      });

      it('accepts nulls by default', () => {});
    });

    it('validates argument count', () => {
      // too many
      // too few
    });

    it('validates wildcards', () => {});

    it('casts strings to dates', () => {});

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
