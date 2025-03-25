/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationMetricsCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('m', [
            "SyntaxError: mismatched input 'm' expecting {'explain', 'row', 'from', 'show'}",
          ]);
          await expectErrors('metrics ', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
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
            await expectErrors('metrics remote-*:indexes*', ['Unknown index [remote-*:indexes*]']);
            await expectErrors('metrics remote-ccs:indexes', [
              'Unknown index [remote-ccs:indexes]',
            ]);
            await expectErrors('metrics a_index, remote-ccs:indexes', [
              'Unknown index [remote-ccs:indexes]',
            ]);
            await expectErrors('metrics .secret_index', []);
          });

          test('errors on trailing comma', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics index,', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
            await expectErrors(`metrics index\n, \tother_index\t,\n \t `, [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
          });

          test('errors on invalid syntax', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`metrics index = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
            ]);
            await expectErrors('metrics `index`', ['Unknown index [`index`]']);
          });

          test('errors on unknown index', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`METRICS index, missingIndex`, ['Unknown index [missingIndex]']);
            await expectErrors(`METRICS average()`, ['Unknown index [average()]']);
            await expectErrors(`metrics custom_function()`, ['Unknown index [custom_function()]']);
            await expectErrors(`metrics indexes*`, ['Unknown index [indexes*]']);
            await expectErrors('metrics doubleField', ['Unknown index [doubleField]']);
            await expectErrors('metrics policy', ['Unknown index [policy]']);
          });
        });

        describe('... <aggregates> ...', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('METRICS a_index | STATS count()', []);
            await expectErrors('metrics a_index | STATS avg(doubleField) by 1', []);
            await expectErrors('metrics a_index | STATS count(`doubleField`)', []);
            await expectErrors('metrics a_index | STATS count(*)', []);
            await expectErrors('metrics index | STATS var0 = count(*)', []);
            await expectErrors('metrics a_index | STATS var0 = count()', []);
            await expectErrors('metrics a_index | STATS var0 = avg(doubleField), count(*)', []);
            await expectErrors(`metrics a_index | STATS sum(case(false, 0, 1))`, []);
            await expectErrors(`metrics a_index | STATS var0 = sum( case(false, 0, 1))`, []);
            await expectErrors('metrics a_index | STATS count(textField == "a" or null)', []);
            await expectErrors('metrics other_index | STATS max(doubleField) by textField', []);
          });

          test('syntax errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index doubleField=', [
              "SyntaxError: mismatched input 'doubleField' expecting <EOF>",
            ]);
          });

          test('errors on unknown function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index var0 = avg(fn(number)), count(*)', [
              "SyntaxError: mismatched input 'var0' expecting <EOF>",
            ]);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'metrics a_index | stats count(`doubleField`) | ' +
                  subCommand +
                  ' `count(``doubleField``)` ',
                []
              );
            }
          });

          test('semantic function validation errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index | stats count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('metrics a_index | stats count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'metrics a_index | stats avg(doubleField), percentile(doubleField, 50) by ipField',
              []
            );
            await expectErrors(
              'metrics a_index | stats avg(doubleField), percentile(doubleField, 50) BY ipField',
              []
            );
            await expectErrors(
              'metrics a_index | stats avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
              []
            );
            await expectErrors(
              'metrics a_index | stats avg(doubleField) by textField | limit 100',
              []
            );
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `metrics a_index | stats avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
                []
              );
            }
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index | stats count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors(
              'metrics a_index \n | stats count(* + round(doubleField)) BY ipField',
              ["SyntaxError: no viable alternative at input 'count(* +'"]
            );
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index | stats count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('metrics a_index | stats count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });

          test('errors on unknown field', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index | stats avg(doubleField) by wrongField', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('metrics a_index | stats avg(doubleField) by wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors(
              'metrics a_index | stats avg(doubleField) by var0 = wrongField + 1',
              ['Unknown column [wrongField]']
            );
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'METRICS a_index | stats avg(doubleField) by percentile(doubleField)',
              ['STATS BY does not support function percentile']
            );
            await expectErrors(
              'METRICS a_index | stats avg(doubleField) by textField, percentile(doubleField) by ipField',
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
