/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as helpers from '../helpers';

export const validationMetricsCommandTestSuite = (setup: helpers.Setup) => {
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
            await expectErrors('metrics other_index max(numberField) by stringField', []);
          });

          test('syntax errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index numberField=', [
              expect.any(String),
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('metrics a_index numberField=5 by ', [
              expect.any(String),
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
          });

          test('errors on unknown function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index var0 = avg(fn(number)), count(*)', [
              'Unknown function [fn]',
            ]);
          });

          test('errors when no aggregation function specified', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index numberField + 1', [
              'At least one aggregation function required in [METRICS], found [numberField+1]',
            ]);
            await expectErrors('metrics a_index a = numberField + 1', [
              'At least one aggregation function required in [METRICS], found [a=numberField+1]',
            ]);
            await expectErrors('metrics a_index a = numberField + 1, stringField', [
              'At least one aggregation function required in [METRICS], found [a=numberField+1]',
              'Expected an aggregate function or group but got [stringField] of type [FieldAttribute]',
            ]);
            await expectErrors('metrics a_index numberField + 1 by ipField', [
              'At least one aggregation function required in [METRICS], found [numberField+1]',
            ]);
          });

          test('errors on agg and non-agg mix', async () => {
            const { expectErrors } = await setup();

            await expectErrors('METRICS a_index sum( numberField ) + abs( numberField ) ', [
              'Cannot combine aggregation and non-aggregation values in [METRICS], found [sum(numberField)+abs(numberField)]',
            ]);
            await expectErrors('METRICS a_index abs( numberField + sum( numberField )) ', [
              'Cannot combine aggregation and non-aggregation values in [METRICS], found [abs(numberField+sum(numberField))]',
            ]);
          });

          test('errors when aggregation functions are nested', async () => {
            const { expectErrors } = await setup();

            // avg() inside avg()
            await expectErrors('METRICS a_index avg(to_long(avg(2)))', [
              'The aggregation function [avg] cannot be used as an argument in another aggregation function',
            ]);
          });

          test('errors when input is not an aggregate function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index numberField ', [
              'Expected an aggregate function or group but got [numberField] of type [FieldAttribute]',
            ]);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'metrics a_index count(`numberField`) | ' +
                  subCommand +
                  ' `count(``numberField``)` ',
                []
              );
            }
          });

          test('semantic function validation errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('metrics a_index count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
            ]);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'metrics a_index avg(numberField), percentile(numberField, 50) by ipField',
              []
            );
            await expectErrors(
              'metrics a_index avg(numberField), percentile(numberField, 50) BY ipField',
              []
            );
            await expectErrors(
              'metrics a_index avg(numberField), percentile(numberField, 50) + 1 by ipField',
              []
            );
            await expectErrors('metrics a_index avg(numberField) by stringField | limit 100', []);
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `metrics a_index avg(numberField) ${op} percentile(numberField, 50) BY ipField`,
                []
              );
            }
          });

          test('syntax does not allow <grouping> clause without <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index BY stringField', [
              'Expected an aggregate function or group but got [BY] of type [FieldAttribute]',
              "SyntaxError: extraneous input 'stringField' expecting <EOF>",
            ]);
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors('metrics a_index \n count(* + round(numberField)) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('metrics a_index count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('metrics a_index count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
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
            await expectErrors('metrics a_index avg(numberField) by var0 = wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('METRICS a_index  avg(numberField) by percentile(numberField)', [
              'METRICS BY does not support function percentile',
            ]);
            await expectErrors(
              'METRICS a_index avg(numberField) by stringField, percentile(numberField) by ipField',
              [
                "SyntaxError: mismatched input 'by' expecting <EOF>",
                'METRICS BY does not support function percentile',
              ]
            );
          });
        });
      });
    });
  });
};
