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
      describe('INLINESTATS <aggregates> [ BY <grouping> ]', () => {
        test('no errors on correct usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | INLINESTATS by textField', []);
          await expectErrors(
            `FROM index
            | EVAL doubleField * 3.281
            | INLINESTATS avg_doubleField = AVG(\`doubleField * 3.281\`)`,
            []
          );
          await expectErrors(
            `FROM index | INLINESTATS AVG(doubleField) by round(doubleField) + 1 | EVAL \`round(doubleField) + 1\` / 2`,
            []
          );
        });

        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | INLINESTATS ', [
            'At least one aggregation or grouping expression required in [INLINESTATS]',
          ]);
        });

        describe('... <aggregates> ...', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS avg(doubleField) by 1', []);
            await expectErrors('from a_index | INLINESTATS count(`doubleField`)', []);
            await expectErrors('from a_index | INLINESTATS count(*)', []);
            await expectErrors('from a_index | INLINESTATS count()', []);
            await expectErrors('from a_index | INLINESTATS var0 = count(*)', []);
            await expectErrors('from a_index | INLINESTATS var0 = count()', []);
            await expectErrors('from a_index | INLINESTATS var0 = avg(doubleField), count(*)', []);
            await expectErrors(`from a_index | INLINESTATS sum(case(false, 0, 1))`, []);
            await expectErrors(`from a_index | INLINESTATS var0 = sum( case(false, 0, 1))`, []);

            // "or" must accept "null"
            await expectErrors('from a_index | INLINESTATS count(textField == "a" or null)', []);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'from a_index | INLINESTATS count(`doubleField`) | ' +
                  subCommand +
                  ' `count(``doubleField``)` ',
                []
              );
            }
          });

          test('errors on agg and non-agg mix', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'from a_index | INLINESTATS sum( doubleField ) + abs( doubleField ) ',
              [
                'Cannot combine aggregation and non-aggregation values in [INLINESTATS], found [sum(doubleField)+abs(doubleField)]',
              ]
            );
            await expectErrors(
              'from a_index | INLINESTATS abs( doubleField + sum( doubleField )) ',
              [
                'Cannot combine aggregation and non-aggregation values in [INLINESTATS], found [abs(doubleField+sum(doubleField))]',
              ]
            );
          });

          test('errors on each aggregation field, which does not contain at least one agg function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS doubleField + 1', [
              'At least one aggregation function required in [INLINESTATS], found [doubleField+1]',
            ]);
            await expectErrors('from a_index | INLINESTATS doubleField + 1, textField', [
              'At least one aggregation function required in [INLINESTATS], found [doubleField+1]',
              'Expected an aggregate function or group but got [textField] of type [FieldAttribute]',
            ]);
            await expectErrors(
              'from a_index | INLINESTATS doubleField + 1, doubleField + 2, count()',
              [
                'At least one aggregation function required in [INLINESTATS], found [doubleField+1]',
                'At least one aggregation function required in [INLINESTATS], found [doubleField+2]',
              ]
            );
            await expectErrors(
              'from a_index | INLINESTATS doubleField + 1, doubleField + count(), count()',
              ['At least one aggregation function required in [INLINESTATS], found [doubleField+1]']
            );
            await expectErrors('from a_index | INLINESTATS 5 + doubleField + 1', [
              'At least one aggregation function required in [INLINESTATS], found [5+doubleField+1]',
            ]);
            await expectErrors('from a_index | INLINESTATS doubleField + 1 by ipField', [
              'At least one aggregation function required in [INLINESTATS], found [doubleField+1]',
            ]);
          });

          test('errors when input is not an aggregate function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS doubleField ', [
              'Expected an aggregate function or group but got [doubleField] of type [FieldAttribute]',
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS doubleField=', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | INLINESTATS doubleField=5 by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | INLINESTATS avg(doubleField) by wrongField', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | INLINESTATS avg(doubleField) by wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField) by var0 = wrongField + 1',
              ['Unknown column [wrongField]']
            );
            await expectErrors('from a_index | INLINESTATS var0 = avg(fn(number)), count(*)', [
              'Unknown function [fn]',
            ]);
          });

          test('semantic errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | INLINESTATS count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField), percentile(doubleField, 50) by ipField',
              []
            );
            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField), percentile(doubleField, 50) BY ipField',
              []
            );
            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
              []
            );
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `from a_index | INLINESTATS avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
                []
              );
            }
          });

          test('cannot specify <grouping> without <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors(
              'from a_index | INLINESTATS count(* + round(doubleField)) BY ipField',
              ["SyntaxError: no viable alternative at input 'count(* +'"]
            );
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | INLINESTATS count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | INLINESTATS count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField) by percentile(doubleField)',
              ['INLINESTATS BY does not support function percentile']
            );
            await expectErrors(
              'from a_index | INLINESTATS avg(doubleField) by textField, percentile(doubleField) by ipField',
              [
                "SyntaxError: mismatched input 'by' expecting <EOF>",
                'INLINESTATS BY does not support function percentile',
              ]
            );
          });

          describe('constant-only parameters', () => {
            test('no errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                'from index | INLINESTATS by bucket(dateField, 1 + 30 / 10, "", "")',
                []
              );
              await expectErrors(
                'from index | INLINESTATS by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
                ['Argument of [bucket] must be [date], found value [concat("","")] type [keyword]']
              );
            });

            test('errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors('from index | INLINESTATS by bucket(dateField, pi(), "", "")', [
                'Argument of [bucket] must be [integer], found value [pi()] type [double]',
              ]);

              await expectErrors(
                'from index | INLINESTATS by bucket(dateField, abs(doubleField), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(doubleField)]']
              );
              await expectErrors(
                'from index | INLINESTATS by bucket(dateField, abs(length(doubleField)), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(length(doubleField))]']
              );
              await expectErrors(
                'from index | INLINESTATS by bucket(dateField, doubleField, textField, textField)',
                [
                  'Argument of [bucket] must be a constant, received [doubleField]',
                  'Argument of [bucket] must be a constant, received [textField]',
                  'Argument of [bucket] must be a constant, received [textField]',
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
                    `from a_index | INLINESTATS 5 + avg(doubleField) ${builtinWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS 5 ${builtinWrapping} + avg(doubleField)`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | INLINESTATS 5 ${builtinWrapping} + doubleField`,
                    [
                      `At least one aggregation function required in [INLINESTATS], found [5${builtinWrapping}+doubleField]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS 5 + doubleField ${builtinWrapping}`,
                    [
                      `At least one aggregation function required in [INLINESTATS], found [5+doubleField${builtinWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS 5 + doubleField ${builtinWrapping}, var0 = sum(doubleField)`,
                    [
                      `At least one aggregation function required in [INLINESTATS], found [5+doubleField${builtinWrapping}]`,
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
                    `from a_index | INLINESTATS ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} sum(doubleField) ${closingWrapping} + ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} sum(doubleField + doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping} + ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS sum(${evalWrapping} doubleField ${closingWrapping} )`,
                    []
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS sum(${evalWrapping} doubleField ${closingWrapping} ) + sum(${evalWrapping} doubleField ${closingWrapping} )`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [INLINESTATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, var0 = sum(doubleField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [INLINESTATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | INLINESTATS var0 = ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, var1 = sum(doubleField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [INLINESTATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
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
