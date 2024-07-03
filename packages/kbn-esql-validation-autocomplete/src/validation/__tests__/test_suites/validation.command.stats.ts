/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as helpers from '../helpers';

export const validationStatsCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('STATS <aggregates> [ BY <grouping> ]', () => {
        test('no errors on correct usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | stats by stringField', []);
          await expectErrors(
            `FROM index
            | EVAL numberField * 3.281
            | STATS avg_numberField = AVG(\`numberField * 3.281\`)`,
            []
          );
          await expectErrors(
            `FROM index | STATS AVG(numberField) by round(numberField) + 1 | EVAL \`round(numberField) + 1\` / 2`,
            []
          );
        });

        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | stats ', [
            'At least one aggregation or grouping expression required in [STATS]',
          ]);
        });

        describe('... <aggregates> ...', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats avg(numberField) by 1', []);
            await expectErrors('from a_index | stats count(`numberField`)', []);
            await expectErrors('from a_index | stats count(*)', []);
            await expectErrors('from a_index | stats count()', []);
            await expectErrors('from a_index | stats var0 = count(*)', []);
            await expectErrors('from a_index | stats var0 = count()', []);
            await expectErrors('from a_index | stats var0 = avg(numberField), count(*)', []);
            await expectErrors(`from a_index | stats sum(case(false, 0, 1))`, []);
            await expectErrors(`from a_index | stats var0 = sum( case(false, 0, 1))`, []);

            // "or" must accept "null"
            await expectErrors('from a_index | stats count(stringField == "a" or null)', []);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'from a_index | stats count(`numberField`) | ' +
                  subCommand +
                  ' `count(``numberField``)` ',
                []
              );
            }
          });

          test('errors on agg and non-agg mix', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | STATS sum( numberField ) + abs( numberField ) ', [
              'Cannot combine aggregation and non-aggregation values in [STATS], found [sum(numberField)+abs(numberField)]',
            ]);
            await expectErrors('from a_index | STATS abs( numberField + sum( numberField )) ', [
              'Cannot combine aggregation and non-aggregation values in [STATS], found [abs(numberField+sum(numberField))]',
            ]);
          });

          test('errors on each aggregation field, which does not contain at least one agg function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats numberField + 1', [
              'At least one aggregation function required in [STATS], found [numberField+1]',
            ]);
            await expectErrors('from a_index | stats numberField + 1, stringField', [
              'At least one aggregation function required in [STATS], found [numberField+1]',
              'Expected an aggregate function or group but got [stringField] of type [FieldAttribute]',
            ]);
            await expectErrors('from a_index | stats numberField + 1, numberField + 2, count()', [
              'At least one aggregation function required in [STATS], found [numberField+1]',
              'At least one aggregation function required in [STATS], found [numberField+2]',
            ]);
            await expectErrors(
              'from a_index | stats numberField + 1, numberField + count(), count()',
              ['At least one aggregation function required in [STATS], found [numberField+1]']
            );
            await expectErrors('from a_index | stats 5 + numberField + 1', [
              'At least one aggregation function required in [STATS], found [5+numberField+1]',
            ]);
            await expectErrors('from a_index | stats numberField + 1 by ipField', [
              'At least one aggregation function required in [STATS], found [numberField+1]',
            ]);
          });

          test('errors when input is not an aggregate function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats numberField ', [
              'Expected an aggregate function or group but got [numberField] of type [FieldAttribute]',
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats numberField=', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | stats numberField=5 by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | stats avg(numberField) by wrongField', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats avg(numberField) by wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats avg(numberField) by var0 = wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats var0 = avg(fn(number)), count(*)', [
              'Unknown function [fn]',
            ]);
          });

          test('semantic errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | stats count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
            ]);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'from a_index | stats avg(numberField), percentile(numberField, 50) by ipField',
              []
            );
            await expectErrors(
              'from a_index | stats avg(numberField), percentile(numberField, 50) BY ipField',
              []
            );
            await expectErrors(
              'from a_index | stats avg(numberField), percentile(numberField, 50) + 1 by ipField',
              []
            );
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `from a_index | stats avg(numberField) ${op} percentile(numberField, 50) BY ipField`,
                []
              );
            }
          });

          test('cannot specify <grouping> without <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors('from a_index | stats count(* + round(numberField)) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | stats count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats avg(numberField) by percentile(numberField)', [
              'STATS BY does not support function percentile',
            ]);
            await expectErrors(
              'from a_index | stats avg(numberField) by stringField, percentile(numberField) by ipField',
              [
                "SyntaxError: mismatched input 'by' expecting <EOF>",
                'STATS BY does not support function percentile',
              ]
            );
          });

          describe('constant-only parameters', () => {
            test('no errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors('from index | stats by bucket(dateField, pi(), "", "")', []);
              await expectErrors(
                'from index | stats by bucket(dateField, 1 + 30 / 10, "", "")',
                []
              );
              await expectErrors(
                'from index | stats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
                []
              );
            });

            test('errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                'from index | stats by bucket(dateField, abs(numberField), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(numberField)]']
              );
              await expectErrors(
                'from index | stats by bucket(dateField, abs(length(numberField)), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(length(numberField))]']
              );
              await expectErrors(
                'from index | stats by bucket(dateField, numberField, stringField, stringField)',
                [
                  'Argument of [bucket] must be a constant, received [numberField]',
                  'Argument of [bucket] must be a constant, received [stringField]',
                  'Argument of [bucket] must be a constant, received [stringField]',
                ]
              );
            });
          });
        });

        describe('nesting', () => {
          const NESTING_LEVELS = 4;
          const NESTED_DEPTHS = Array(NESTING_LEVELS)
            .fill(0)
            .map((_, i) => i + 1);

          for (const nesting of NESTED_DEPTHS) {
            describe(`depth = ${nesting}`, () => {
              describe('builtin', () => {
                const builtinWrapping = Array(nesting).fill('+1').join('');

                test('no errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats 5 + avg(numberField) ${builtinWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats 5 ${builtinWrapping} + avg(numberField)`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(`from a_index | stats 5 ${builtinWrapping} + numberField`, [
                    `At least one aggregation function required in [STATS], found [5${builtinWrapping}+numberField]`,
                  ]);
                  await expectErrors(`from a_index | stats 5 + numberField ${builtinWrapping}`, [
                    `At least one aggregation function required in [STATS], found [5+numberField${builtinWrapping}]`,
                  ]);
                  await expectErrors(
                    `from a_index | stats 5 + numberField ${builtinWrapping}, var0 = sum(numberField)`,
                    [
                      `At least one aggregation function required in [STATS], found [5+numberField${builtinWrapping}]`,
                    ]
                  );
                });
              });

              describe('EVAL', () => {
                const evalWrapping = Array(nesting).fill('round(').join('');
                const closingWrapping = Array(nesting).fill(')').join('');

                test('no errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(numberField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(numberField) ${closingWrapping} + ${evalWrapping} sum(numberField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(numberField + numberField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(numberField + round(numberField)) ${closingWrapping} + ${evalWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats sum(${evalWrapping} numberField ${closingWrapping} )`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats sum(${evalWrapping} numberField ${closingWrapping} ) + sum(${evalWrapping} numberField ${closingWrapping} )`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats ${evalWrapping} numberField + sum(numberField) ${closingWrapping}`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}numberField+sum(numberField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} numberField + sum(numberField) ${closingWrapping}, var0 = sum(numberField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}numberField+sum(numberField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | stats var0 = ${evalWrapping} numberField + sum(numberField) ${closingWrapping}, var1 = sum(numberField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}numberField+sum(numberField)${closingWrapping}]`,
                    ]
                  );
                });
              });
            });
          }
        });
      });
    });
  });
};
