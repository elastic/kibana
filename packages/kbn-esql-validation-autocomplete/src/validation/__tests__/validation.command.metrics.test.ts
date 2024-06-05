/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup } from './helpers';

describe('validation', () => {
  describe('command', () => {
    describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
      test('errors on invalid command start', async () => {
        const { expectErrors } = await setup();

        await expectErrors('m', [
          "SyntaxError: mismatched input 'm' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}",
        ]);
        await expectErrors('metrics ', [
          "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
        ]);
      });

      describe('... <sources> ...', () => {
        test('no errors on correct indices usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics index', []);
          await expectErrors('metrics index, other_index', []);
          await expectErrors('metrics index, other_index,.secret_index', []);
          await expectErrors('metrics .secret_index', []);
          await expectErrors('METRICS .secret_index', []);
          await expectErrors('mEtRiCs .secret_index', []);
          await expectErrors('metrics ind*, other*', []);
          await expectErrors('metrics index*', []);
          await expectErrors('metrics *a_i*dex*', []);
          await expectErrors('metrics in*ex*', []);
          await expectErrors('metrics *n*ex', []);
          await expectErrors('metrics *n*ex*', []);
          await expectErrors('metrics i*d*x*', []);
          await expectErrors('metrics i*d*x', []);
          await expectErrors('metrics i***x*', []);
          await expectErrors('metrics i****', []);
          await expectErrors('metrics i**', []);
          await expectErrors('metrics index**', []);
          await expectErrors('metrics *ex', []);
          await expectErrors('metrics *ex*', []);
          await expectErrors('metrics in*ex', []);
          await expectErrors('metrics ind*ex', []);
          await expectErrors('metrics *,-.*', []);
          await expectErrors('metrics remote-*:indexes*', []);
          await expectErrors('metrics remote-*:indexes', []);
          await expectErrors('metrics remote-ccs:indexes', []);
          await expectErrors('metrics a_index, remote-ccs:indexes', []);
          await expectErrors('metrics .secret_index', []);
        });

        test('errors on trailing comma', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics index,', [
            "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
          ]);
          await expectErrors(`metrics index\n, \tother_index\t,\n \t `, [
            "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
          ]);
        });

        test('errors on invalid syntax', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`metrics index = 1`, [
            "SyntaxError: token recognition error at: '='",
            "SyntaxError: token recognition error at: '1'",
          ]);
          await expectErrors('metrics `index`', [
            "SyntaxError: token recognition error at: '`'",
            "SyntaxError: token recognition error at: '`'",
          ]);
        });

        test('errors on unknown index', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`METRICS index, missingIndex`, ['Unknown index [missingIndex]']);
          await expectErrors(`METRICS average()`, ['Unknown index [average()]']);
          await expectErrors(`metrics custom_function()`, ['Unknown index [custom_function()]']);
          await expectErrors(`metrics indexes*`, ['Unknown index [indexes*]']);
          await expectErrors('metrics numberField', ['Unknown index [numberField]']);
          await expectErrors('metrics policy', ['Unknown index [policy]']);
        });
      });

      describe('... <aggregates> ...', () => {
        test('no errors on correct usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('METRICS a_index count()', []);
          await expectErrors('metrics a_index avg(numberField) by 1', []);
          await expectErrors('metrics a_index count(`numberField`)', []);
          await expectErrors('metrics a_index count(*)', []);
          await expectErrors('metrics index var0 = count(*)', []);
          await expectErrors('metrics a_index var0 = count()', []);
          await expectErrors('metrics a_index var0 = avg(numberField), count(*)', []);
          await expectErrors(`metrics a_index sum(case(false, 0, 1))`, []);
          await expectErrors(`metrics a_index var0 = sum( case(false, 0, 1))`, []);
          await expectErrors('metrics a_index count(stringField == "a" or null)', []);
        });

        test('syntax errors', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index numberField=', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
          ]);
          await expectErrors('metrics a_index numberField=5 by ', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
          ]);
        });

        test.skip('errors on unknown function', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index var0 = avg(fn(number)), count(*)', [
            'Unknown function [fn]',
          ]);
        });

        test.skip('errors when no aggregation function specified', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index numberField + 1', [
            'At least one aggregation function required in [STATS], found [numberField+1]',
          ]);
          await expectErrors('metrics a_index 5 + numberField + 1', [
            'At least one aggregation function required in [STATS], found [5+numberField+1]',
          ]);
          await expectErrors('metrics a_index numberField + 1 by ipField', [
            'At least one aggregation function required in [STATS], found [numberField+1]',
          ]);
        });

        test.skip('sub-command can reference aggregated field', async () => {
          const { expectErrors } = await setup();

          for (const subCommand of ['keep', 'drop', 'eval']) {
            await expectErrors(
              'metrics a_index count(`numberField`) | ' + subCommand + ' `count(``numberField``)` ',
              []
            );
          }
        });

        test.skip('errors on agg and non-agg mix', async () => {
          const { expectErrors } = await setup();

          await expectErrors('METRICS a_index sum( numberField ) + abs( numberField ) ', [
            'Cannot combine aggregation and non-aggregation values in [METRICS], found [sum(numberField)+abs(numberField)]',
          ]);
          await expectErrors('METRICS a_index abs( numberField + sum( numberField )) ', [
            'Cannot combine aggregation and non-aggregation values in [METRICS], found [abs(numberField+sum(numberField))]',
          ]);
        });

        test.skip('errors when input is not an aggregate function', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index numberField ', [
            'Expected an aggregate function or group but got [numberField] of type [FieldAttribute]',
          ]);
        });
      });

      describe('... BY <grouping>', () => {
        test('syntax does not allow BY *grouping* clause without *aggregates*', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index BY stringField', [
            "SyntaxError: extraneous input 'stringField' expecting <EOF>",
          ]);
        });

        test('errors on unknown field', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index avg(numberField) by wrongField', [
            'Unknown column [wrongField]',
          ]);
          await expectErrors('metrics a_index avg(numberField) by wrongField + 1', [
            'Unknown column [wrongField]',
          ]);
          // TODO: Fix this test
          // await expectErrors('metrics a_index avg(numberField) by var0 = wrongField + 1', [
          //   'Unknown column [wrongField]',
          // ]);
        });
      });
    });
  });
});
