/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/validation';

const statsExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'stats', validate);
};

describe('STATS Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('STATS <aggregates> [ BY <grouping> ]', () => {
    const newUserDefinedColumns = new Map(mockContext.userDefinedColumns);
    newUserDefinedColumns.set('doubleField * 3.281', [
      {
        name: 'doubleField * 3.281',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    newUserDefinedColumns.set('avg_doubleField', [
      {
        name: 'avg_doubleField',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    const context = {
      ...mockContext,
      userDefinedColumns: newUserDefinedColumns,
    };
    test('no errors on correct usage', () => {
      statsExpectErrors('from a_index | stats by textField', []);
      statsExpectErrors(
        `FROM index
            | EVAL doubleField * 3.281
            | STATS avg_doubleField = AVG(\`doubleField * 3.281\`)`,
        [],
        context
      );
      statsExpectErrors(
        `FROM index | STATS AVG(doubleField) by round(doubleField) + 1 | EVAL \`round(doubleField) + 1\` / 2`,
        [],
        context
      );
    });

    describe('... <aggregates> ...', () => {
      test('no errors on correct usage', () => {
        statsExpectErrors('from a_index | stats avg(doubleField) by 1', []);
        statsExpectErrors('from a_index | stats count(`doubleField`)', []);
        statsExpectErrors('from a_index | stats count(*)', []);
        statsExpectErrors('from a_index | stats count()', []);
        statsExpectErrors('from a_index | stats col0 = count(*)', []);
        statsExpectErrors('from a_index | stats col0 = count()', []);
        statsExpectErrors('from a_index | stats col0 = avg(doubleField), count(*)', []);
        statsExpectErrors(`from a_index | stats sum(case(false, 0, 1))`, []);
        statsExpectErrors(`from a_index | stats col0 = sum( case(false, 0, 1))`, []);
        statsExpectErrors('from a_index | stats ??func(doubleField)', []);
        statsExpectErrors('from a_index | stats avg(??field)', []);

        // "or" must accept "null"
        statsExpectErrors('from a_index | stats count(textField == "a" or null)', []);
      });

      test('sub-command can reference aggregated field', () => {
        for (const subCommand of ['keep', 'drop', 'eval']) {
          statsExpectErrors(
            'from a_index | stats count(`doubleField`) | ' +
              subCommand +
              ' `count(``doubleField``)` ',
            []
          );
        }
      });

      test('errors on agg and non-agg mix', () => {
        statsExpectErrors('from a_index | STATS sum( doubleField ) + abs( doubleField ) ', [
          'Cannot combine aggregation and non-aggregation values in [STATS], found [sum(doubleField)+abs(doubleField)]',
        ]);
        statsExpectErrors('from a_index | STATS abs( doubleField + sum( doubleField )) ', [
          'Cannot combine aggregation and non-aggregation values in [STATS], found [abs(doubleField+sum(doubleField))]',
        ]);
        // This is a valid expression as it is an operation on two aggregation functions
        statsExpectErrors(
          'from a_index | STATS sum(doubleField) / (min(doubleField) + max(doubleField))  ',
          []
        );
      });

      test('errors on each aggregation field, which does not contain at least one agg function', () => {
        statsExpectErrors('from a_index | stats doubleField + 1', [
          'At least one aggregation function required in [STATS], found [doubleField+1]',
        ]);
        statsExpectErrors('from a_index | stats doubleField + 1, textField', [
          'At least one aggregation function required in [STATS], found [doubleField+1]',
          'Expected an aggregate function or group but got [textField] of type [FieldAttribute]',
        ]);
        statsExpectErrors('from a_index | stats doubleField + 1, doubleField + 2, count()', [
          'At least one aggregation function required in [STATS], found [doubleField+1]',
          'At least one aggregation function required in [STATS], found [doubleField+2]',
        ]);
        statsExpectErrors('from a_index | stats doubleField + 1, doubleField + count(), count()', [
          'At least one aggregation function required in [STATS], found [doubleField+1]',
        ]);
        statsExpectErrors('from a_index | stats 5 + doubleField + 1', [
          'At least one aggregation function required in [STATS], found [5+doubleField+1]',
        ]);
        statsExpectErrors('from a_index | stats doubleField + 1 by ipField', [
          'At least one aggregation function required in [STATS], found [doubleField+1]',
        ]);
      });

      test('errors when input is not an aggregate function', () => {
        statsExpectErrors('from a_index | stats doubleField ', [
          'Expected an aggregate function or group but got [doubleField] of type [FieldAttribute]',
        ]);
      });

      test('various errors', () => {
        statsExpectErrors('from a_index | stats avg(doubleField) by wrongField', [
          'Unknown column [wrongField]',
        ]);
        statsExpectErrors('from a_index | stats avg(doubleField) by wrongField + 1', [
          'Unknown column [wrongField]',
        ]);
        statsExpectErrors('from a_index | stats avg(doubleField) by col0 = wrongField + 1', [
          'Unknown column [wrongField]',
        ]);
        statsExpectErrors('from a_index | stats col0 = avg(fn(number)), count(*)', [
          'Unknown function [fn]',
        ]);
      });

      test('semantic errors', () => {
        statsExpectErrors('from a_index | stats count(round(*))', [
          'Using wildcards (*) in round is not allowed',
        ]);
        statsExpectErrors('from a_index | stats count(count(*))', [
          `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
        ]);
      });

      test('allows WHERE clause', () => {
        statsExpectErrors('FROM a_index | STATS col0 = avg(doubleField) WHERE 123', []);
      });
    });

    describe('... BY <grouping>', () => {
      test('no errors on correct usage', () => {
        statsExpectErrors(
          'from a_index | stats avg(doubleField), percentile(doubleField, 50) by ipField',
          []
        );
        statsExpectErrors(
          'from a_index | stats avg(doubleField), percentile(doubleField, 50) BY ipField',
          []
        );
        statsExpectErrors(
          'from a_index | stats avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
          []
        );
        statsExpectErrors('from a_index | stats avg(doubleField) by ??field', []);
        for (const op of ['+', '-', '*', '/', '%']) {
          statsExpectErrors(
            `from a_index | stats avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
            []
          );
        }
      });

      test('semantic errors in <aggregates>', () => {
        statsExpectErrors('from a_index | stats count(round(*)) BY ipField', [
          'Using wildcards (*) in round is not allowed',
        ]);
        statsExpectErrors('from a_index | stats count(count(*)) BY ipField', [
          `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
        ]);
      });

      test('various errors', () => {
        statsExpectErrors('from a_index | stats avg(doubleField) by percentile(doubleField)', [
          'STATS BY does not support function percentile',
        ]);
        statsExpectErrors(
          'from a_index | stats avg(doubleField) by textField, percentile(doubleField) by ipField',
          ['STATS BY does not support function percentile']
        );
      });

      describe('constant-only parameters', () => {
        test('no errors', () => {
          statsExpectErrors('from index | stats by bucket(dateField, 1 + 30 / 10, "", "")', []);
          statsExpectErrors(
            'from index | stats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
            []
          );
        });

        test('errors', () => {
          statsExpectErrors('from index | stats by bucket(dateField, pi(), "", "")', [
            'Argument of [bucket] must be [integer], found value [pi()] type [double]',
          ]);

          statsExpectErrors('from index | stats by bucket(dateField, abs(doubleField), "", "")', [
            'Argument of [bucket] must be a constant, received [abs(doubleField)]',
          ]);
          statsExpectErrors(
            'from index | stats by bucket(dateField, abs(length(doubleField)), "", "")',
            ['Argument of [bucket] must be a constant, received [abs(length(doubleField))]']
          );
          statsExpectErrors(
            'from index | stats by bucket(dateField, doubleField, textField, textField)',
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
          describe('operators', () => {
            const operatorsWrapping = Array(nesting).fill('+1').join('');

            test('no errors', () => {
              statsExpectErrors(
                `from a_index | stats 5 + avg(doubleField) ${operatorsWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats 5 ${operatorsWrapping} + avg(doubleField)`,
                []
              );
            });

            test('errors', () => {
              statsExpectErrors(`from a_index | stats 5 ${operatorsWrapping} + doubleField`, [
                `At least one aggregation function required in [STATS], found [5${operatorsWrapping}+doubleField]`,
              ]);
              statsExpectErrors(`from a_index | stats 5 + doubleField ${operatorsWrapping}`, [
                `At least one aggregation function required in [STATS], found [5+doubleField${operatorsWrapping}]`,
              ]);
              statsExpectErrors(
                `from a_index | stats 5 + doubleField ${operatorsWrapping}, col0 = sum(doubleField)`,
                [
                  `At least one aggregation function required in [STATS], found [5+doubleField${operatorsWrapping}]`,
                ]
              );
            });
          });

          describe('EVAL', () => {
            const evalWrapping = Array(nesting).fill('round(').join('');
            const closingWrapping = Array(nesting).fill(')').join('');

            test('no errors', () => {
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} sum(doubleField) ${closingWrapping} + ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} sum(doubleField + doubleField) ${closingWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping} + ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                []
              );
              statsExpectErrors(
                `from a_index | stats sum(${evalWrapping} doubleField ${closingWrapping} )`,
                []
              );
              statsExpectErrors(
                `from a_index | stats sum(${evalWrapping} doubleField ${closingWrapping} ) + sum(${evalWrapping} doubleField ${closingWrapping} )`,
                []
              );
            });

            test('errors', () => {
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}`,
                [
                  `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                ]
              );
              statsExpectErrors(
                `from a_index | stats ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, col0 = sum(doubleField)`,
                [
                  `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                ]
              );
              statsExpectErrors(
                `from a_index | stats col0 = ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, var0 = sum(doubleField)`,
                [
                  `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                ]
              );
            });
          });
        });
      }
    });
  });
});
