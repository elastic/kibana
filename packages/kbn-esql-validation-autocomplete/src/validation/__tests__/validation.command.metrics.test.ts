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
    describe('METRICS', () => {
      test('no errors on valid index list', async () => {
        const { expectErrors } = await setup();

        await expectErrors('metrics index', []);
        await expectErrors('metrics index, other_index', []);
        await expectErrors('metrics index, other_index,.secret_index', []);
        await expectErrors('metrics .secret_index', []);
        await expectErrors('METRICS .secret_index', []);
        await expectErrors('mEtRiCs .secret_index', []);
      });

      test('errors on invalid command start', async () => {
        const { expectErrors } = await setup();

        await expectErrors('m', [
          "SyntaxError: mismatched input 'm' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}",
        ]);
        await expectErrors('metrics ', [
          "SyntaxError: missing INDEX_UNQUOTED_IDENTIFIER at '<EOF>'",
        ]);
      });

      describe('indices', () => {
        test('no errors on correct indices usage', async () => {
          const { expectErrors } = await setup();

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

      describe('grouping', () => {
        test('syntax does not allow BY *grouping* clause without *aggregates*', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index BY stringField', [
            "SyntaxError: extraneous input 'stringField' expecting <EOF>",
          ]);
        });
      });

      describe('aggregates', () => {
        test('no errors when using aggregate functions correctly', async () => {
          const { expectErrors } = await setup();

          await expectErrors('metrics a_index avg( numberField )', []);
          await expectErrors('metrics a_index count(`numberField`)', []);
          await expectErrors('METRICS a_index count(`numberField`)\n\t\t', []);
          await expectErrors('metrics a_index avg(numberField) by 1', []);
        });

        test('returns errors on wrong fields', async () => {
          const { expectErrors } = await setup();

          // await expectErrors('metrics a_index avg(numberField) by wrongField', [
          //   'Unknown column [wrongField]',
          // ]);
          // await expectErrors('metrics a_index avg(numberField) by wrongField + 1', [
          //   'Unknown column [wrongField]',
          // ]);
          // await expectErrors('from a_index | stats avg(numberField) by var0 = wrongField + 1', [
          //   'Unknown column [wrongField]',
          // ]);
          await expectErrors('metrics a_index avg(numberField) by var0 = wrongField + 1', [
            'Unknown column [wrongField]',
          ]);
        });

        // testErrorsAndWarnings('from a_index | stats by ', [
        //   "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        // ]);
        //   testErrorsAndWarnings('from a_index | stats numberField ', [
        //     'Expected an aggregate function or group but got [numberField] of type [FieldAttribute]',
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats numberField=', [
        //     "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats numberField=5 by ', [
        //     "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        //   ]);

        //   testErrorsAndWarnings('from a_index | stats avg(numberField) by percentile(numberField)', [
        //     'STATS BY does not support function percentile',
        //   ]);

        //   // this is a scenario that was failing because "or" didn't accept "null"
        //   testErrorsAndWarnings('from a_index | stats count(stringField == "a" or null)', []);

        //   for (const subCommand of ['keep', 'drop', 'eval']) {
        //     testErrorsAndWarnings(
        //       `from a_index | stats count(\`numberField\`) | ${subCommand} \`count(\`\`numberField\`\`)\` `,
        //       []
        //     );
        //   }

        //   testErrorsAndWarnings(
        //     'from a_index | stats avg(numberField) by stringField, percentile(numberField) by ipField',
        //     [
        //       "SyntaxError: mismatched input 'by' expecting <EOF>",
        //       'STATS BY does not support function percentile',
        //     ]
        //   );

        //   testErrorsAndWarnings(
        //     'from a_index | stats avg(numberField), percentile(numberField, 50) by ipField',
        //     []
        //   );

        //   testErrorsAndWarnings(
        //     'from a_index | stats avg(numberField), percentile(numberField, 50) BY ipField',
        //     []
        //   );
        //   for (const op of ['+', '-', '*', '/', '%']) {
        //     testErrorsAndWarnings(
        //       `from a_index | stats avg(numberField) ${op} percentile(numberField, 50) BY ipField`,
        //       []
        //     );
        //   }
        //   testErrorsAndWarnings('from a_index | stats count(* + 1) BY ipField', [
        //     "SyntaxError: no viable alternative at input 'count(* +'",
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats count(* + round(numberField)) BY ipField', [
        //     "SyntaxError: no viable alternative at input 'count(* +'",
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats count(round(*)) BY ipField', [
        //     'Using wildcards (*) in round is not allowed',
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats count(count(*)) BY ipField', [
        //     `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
        //   ]);
        //   testErrorsAndWarnings('from a_index | stats numberField + 1', [
        //     'At least one aggregation function required in [STATS], found [numberField+1]',
        //   ]);

        //   for (const nesting of NESTED_DEPTHS) {
        //     const moreBuiltinWrapping = Array(nesting).fill('+1').join('');
        //     testErrorsAndWarnings(
        //       `from a_index | stats 5 + avg(numberField) ${moreBuiltinWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats 5 ${moreBuiltinWrapping} + avg(numberField)`,
        //       []
        //     );
        //     testErrorsAndWarnings(`from a_index | stats 5 ${moreBuiltinWrapping} + numberField`, [
        //       `At least one aggregation function required in [STATS], found [5${moreBuiltinWrapping}+numberField]`,
        //     ]);
        //     testErrorsAndWarnings(`from a_index | stats 5 + numberField ${moreBuiltinWrapping}`, [
        //       `At least one aggregation function required in [STATS], found [5+numberField${moreBuiltinWrapping}]`,
        //     ]);
        //     testErrorsAndWarnings(
        //       `from a_index | stats 5 + numberField ${moreBuiltinWrapping}, var0 = sum(numberField)`,
        //       [
        //         `At least one aggregation function required in [STATS], found [5+numberField${moreBuiltinWrapping}]`,
        //       ]
        //     );
        //     const evalFnWrapping = Array(nesting).fill('round(').join('');
        //     const closingWrapping = Array(nesting).fill(')').join('');
        //     // stress test the validation of the nesting check here
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} sum(numberField) ${closingWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} sum(numberField) ${closingWrapping} + ${evalFnWrapping} sum(numberField) ${closingWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}`,
        //       [
        //         `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
        //       ]
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}, var0 = sum(numberField)`,
        //       [
        //         `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
        //       ]
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats var0 = ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}, var1 = sum(numberField)`,
        //       [
        //         `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
        //       ]
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} sum(numberField + numberField) ${closingWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping} + ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats sum(${evalFnWrapping} numberField ${closingWrapping} )`,
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       `from a_index | stats sum(${evalFnWrapping} numberField ${closingWrapping} ) + sum(${evalFnWrapping} numberField ${closingWrapping} )`,
        //       []
        //     );
        //   }

        //   testErrorsAndWarnings('from a_index | stats 5 + numberField + 1', [
        //     'At least one aggregation function required in [STATS], found [5+numberField+1]',
        //   ]);

        //   testErrorsAndWarnings('from a_index | stats numberField + 1 by ipField', [
        //     'At least one aggregation function required in [STATS], found [numberField+1]',
        //   ]);

        //   testErrorsAndWarnings(
        //     'from a_index | stats avg(numberField), percentile(numberField, 50) + 1 by ipField',
        //     []
        //   );

        //   testErrorsAndWarnings('from a_index | stats count(*)', []);
        //   testErrorsAndWarnings('from a_index | stats count()', []);
        //   testErrorsAndWarnings('from a_index | stats var0 = count(*)', []);
        //   testErrorsAndWarnings('from a_index | stats var0 = count()', []);
        //   testErrorsAndWarnings('from a_index | stats var0 = avg(numberField), count(*)', []);
        //   testErrorsAndWarnings('from a_index | stats var0 = avg(fn(number)), count(*)', [
        //     'Unknown function [fn]',
        //   ]);

        //   // test all not allowed combinations
        //   testErrorsAndWarnings('from a_index | STATS sum( numberField ) + abs( numberField ) ', [
        //     'Cannot combine aggregation and non-aggregation values in [STATS], found [sum(numberField)+abs(numberField)]',
        //   ]);
        //   testErrorsAndWarnings('from a_index | STATS abs( numberField + sum( numberField )) ', [
        //     'Cannot combine aggregation and non-aggregation values in [STATS], found [abs(numberField+sum(numberField))]',
        //   ]);

        //   testErrorsAndWarnings(
        //     `FROM index
        // | EVAL numberField * 3.281
        // | STATS avg_numberField = AVG(\`numberField * 3.281\`)`,
        //     []
        //   );

        //   testErrorsAndWarnings(
        //     `FROM index | STATS AVG(numberField) by round(numberField) + 1 | EVAL \`round(numberField) + 1\` / 2`,
        //     []
        //   );

        //   testErrorsAndWarnings(`from a_index | stats sum(case(false, 0, 1))`, []);
        //   testErrorsAndWarnings(`from a_index | stats var0 = sum( case(false, 0, 1))`, []);

        //   describe('constant-only parameters', () => {
        //     testErrorsAndWarnings('from index | stats by bucket(dateField, abs(numberField), "", "")', [
        //       'Argument of [bucket] must be a constant, received [abs(numberField)]',
        //     ]);
        //     testErrorsAndWarnings(
        //       'from index | stats by bucket(dateField, abs(length(numberField)), "", "")',
        //       ['Argument of [bucket] must be a constant, received [abs(length(numberField))]']
        //     );
        //     testErrorsAndWarnings('from index | stats by bucket(dateField, pi(), "", "")', []);
        //     testErrorsAndWarnings('from index | stats by bucket(dateField, 1 + 30 / 10, "", "")', []);
        //     testErrorsAndWarnings(
        //       'from index | stats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
        //       []
        //     );
        //     testErrorsAndWarnings(
        //       'from index | stats by bucket(dateField, numberField, stringField, stringField)',
        //       [
        //         'Argument of [bucket] must be a constant, received [numberField]',
        //         'Argument of [bucket] must be a constant, received [stringField]',
        //         'Argument of [bucket] must be a constant, received [stringField]',
        //       ]
        //     );
        //   });
      });
    });
  });
});
