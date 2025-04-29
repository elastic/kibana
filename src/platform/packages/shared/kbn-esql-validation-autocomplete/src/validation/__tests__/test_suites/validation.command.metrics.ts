/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationTimeseriesCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('TS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('m', [
            "SyntaxError: mismatched input 'm' expecting {'explain', 'row', 'from', 'show'}",
          ]);
          await expectErrors('ts ', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
          ]);
        });

        describe('... <sources> ...', () => {
          test('no errors on correct indices usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('ts index', []);
            await expectErrors('ts index, other_index', []);
            await expectErrors('ts index, other_index,.secret_index', []);
            await expectErrors('ts .secret_index', []);
            await expectErrors('TS .secret_index', []);
            await expectErrors('Ts .secret_index', []);
            await expectErrors('ts ind*, other*', []);
            await expectErrors('ts index*', []);
            await expectErrors('ts *a_i*dex*', []);
            await expectErrors('ts in*ex*', []);
            await expectErrors('ts *n*ex', []);
            await expectErrors('ts *n*ex*', []);
            await expectErrors('ts i*d*x*', []);
            await expectErrors('ts i*d*x', []);
            await expectErrors('ts i***x*', []);
            await expectErrors('ts i****', []);
            await expectErrors('ts i**', []);
            await expectErrors('ts index**', []);
            await expectErrors('ts *ex', []);
            await expectErrors('ts *ex*', []);
            await expectErrors('ts in*ex', []);
            await expectErrors('ts ind*ex', []);
            await expectErrors('ts *,-.*', []);
            await expectErrors('ts remote-*:indexes*', ['Unknown index [remote-*:indexes*]']);
            await expectErrors('ts remote-ccs:indexes', ['Unknown index [remote-ccs:indexes]']);
            await expectErrors('ts a_index, remote-ccs:indexes', [
              'Unknown index [remote-ccs:indexes]',
            ]);
            await expectErrors('ts .secret_index', []);
          });

          test('errors on trailing comma', async () => {
            const { expectErrors } = await setup();

            await expectErrors('ts index,', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
            await expectErrors(`ts index\n, \tother_index\t,\n \t `, [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
          });

          test('errors on invalid syntax', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`ts index = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
            ]);
            await expectErrors('ts `index`', ['Unknown index [`index`]']);
          });

          test('errors on unknown index', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`TS index, missingIndex`, ['Unknown index [missingIndex]']);
            await expectErrors(`TS average()`, ['Unknown index [average()]']);
            await expectErrors(`ts custom_function()`, ['Unknown index [custom_function()]']);
            await expectErrors(`ts indexes*`, ['Unknown index [indexes*]']);
            await expectErrors('ts doubleField', ['Unknown index [doubleField]']);
            await expectErrors('ts policy', ['Unknown index [policy]']);
          });
        });

        describe('... <aggregates> ...', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | STATS count()', []);
            await expectErrors('ts a_index | STATS avg(doubleField) by 1', []);
            await expectErrors('ts a_index | STATS count(`doubleField`)', []);
            await expectErrors('ts a_index | STATS count(*)', []);
            await expectErrors('ts index | STATS col0 = count(*)', []);
            await expectErrors('ts a_index | STATS col0 = count()', []);
            await expectErrors('ts a_index | STATS col0 = avg(doubleField), count(*)', []);
            await expectErrors(`ts a_index | STATS sum(case(false, 0, 1))`, []);
            await expectErrors(`ts a_index | STATS col0 = sum( case(false, 0, 1))`, []);
            await expectErrors('ts a_index | STATS count(textField == "a" or null)', []);
            await expectErrors('ts other_index | STATS max(doubleField) by textField', []);
          });

          test('syntax errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('ts a_index doubleField=', [
              "SyntaxError: mismatched input 'doubleField' expecting <EOF>",
            ]);
          });

          test('errors on unknown function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('ts a_index col0 = avg(fn(number)), count(*)', [
              "SyntaxError: mismatched input 'col0' expecting <EOF>",
            ]);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'TS a_index | stats count(`doubleField`) | ' +
                  subCommand +
                  ' `count(``doubleField``)` ',
                []
              );
            }
          });

          test('semantic function validation errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | stats count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('TS a_index | stats count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'TS a_index | stats avg(doubleField), percentile(doubleField, 50) by ipField',
              []
            );
            await expectErrors(
              'TS a_index | stats avg(doubleField), percentile(doubleField, 50) BY ipField',
              []
            );
            await expectErrors(
              'TS a_index | stats avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
              []
            );
            await expectErrors('TS a_index | stats avg(doubleField) by textField | limit 100', []);
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `TS a_index | stats avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
                []
              );
            }
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | stats count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors('TS a_index \n | stats count(* + round(doubleField)) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | stats count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('TS a_index | stats count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });

          test('errors on unknown field', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | stats avg(doubleField) by wrongField', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('TS a_index | stats avg(doubleField) by wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('TS a_index | stats avg(doubleField) by col0 = wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('TS a_index | stats avg(doubleField) by percentile(doubleField)', [
              'STATS BY does not support function percentile',
            ]);
            await expectErrors(
              'TS a_index | stats avg(doubleField) by textField, percentile(doubleField) by ipField',
              [
                "SyntaxError: mismatched input 'by' expecting <EOF>",
                'STATS BY does not support function percentile',
              ]
            );
          });
        });
      });
    });
  });
};
