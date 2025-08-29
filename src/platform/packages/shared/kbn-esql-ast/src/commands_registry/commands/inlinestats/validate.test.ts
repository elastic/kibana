/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from '../stats/validate';
import { Parser } from '../../../parser';
import { expectErrors } from '../../../__tests__/validation';
import { getNoValidCallSignatureError } from '../../../definitions/utils/validation/utils';

const inlinestatsExpectErrors = (
  query: string,
  expectedErrors: string[],
  context = mockContext
) => {
  return expectErrors(query, expectedErrors, context, 'inlinestats', validate);
};

describe('INLINESTATS Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('INLINESTATS <aggregates> [ BY <grouping> ]', () => {
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

    describe('... <aggregates> ...', () => {
      test('no errors on correct usage', () => {
        inlinestatsExpectErrors('from a_index | inlinestats avg(doubleField) by 1', []);
        inlinestatsExpectErrors('from a_index | inlinestats count(`doubleField`)', []);
        inlinestatsExpectErrors('from a_index | inlinestats count(*)', []);
        inlinestatsExpectErrors('from a_index | inlinestats count()', []);
        inlinestatsExpectErrors('from a_index | inlinestats col0 = count(*)', []);
        inlinestatsExpectErrors('from a_index | inlinestats col0 = count()', []);
        inlinestatsExpectErrors('from a_index | inlinestats col0 = avg(doubleField), count(*)', []);
        inlinestatsExpectErrors(`from a_index | inlinestats sum(case(false, 0, 1))`, []);
        inlinestatsExpectErrors(`from a_index | inlinestats col0 = sum( case(false, 0, 1))`, []);
        inlinestatsExpectErrors('from a_index | inlinestats ??func(doubleField)', []);
        inlinestatsExpectErrors('from a_index | inlinestats avg(??field)', []);

        // "or" must accept "null"
        inlinestatsExpectErrors('from a_index | inlinestats count(textField == "a" or null)', []);
      });

      test('sub-command can reference aggregated field', () => {
        for (const subCommand of ['keep', 'drop', 'eval']) {
          inlinestatsExpectErrors(
            'from a_index | inlinestats count(`doubleField`) | ' +
              subCommand +
              ' `count(``doubleField``)` ',
            []
          );
        }
      });

      test('errors when input is not an aggregate function', () => {
        inlinestatsExpectErrors('from a_index | inlinestats doubleField ', [
          'Expected an aggregate function or group but got [doubleField] of type [FieldAttribute]',
        ]);
      });

      test('various errors', () => {
        inlinestatsExpectErrors('from a_index | inlinestats avg(doubleField) by wrongField', [
          'Unknown column [wrongField]',
        ]);
        inlinestatsExpectErrors('from a_index | inlinestats avg(doubleField) by wrongField + 1', [
          'Unknown column [wrongField]',
        ]);
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField) by col0 = wrongField + 1',
          ['Unknown column [wrongField]']
        );
        inlinestatsExpectErrors('from a_index | inlinestats col0 = avg(fn(number)), count(*)', [
          'Unknown function [fn]',
        ]);
      });

      test('allows WHERE clause', () => {
        inlinestatsExpectErrors('FROM a_index | INLINESTATS col0 = avg(doubleField) WHERE 123', []);
      });
    });

    describe('... BY <grouping>', () => {
      test('no errors on correct usage', () => {
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField), percentile(doubleField, 50) by ipField',
          []
        );
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField), percentile(doubleField, 50) BY ipField',
          []
        );
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
          []
        );
        inlinestatsExpectErrors('from a_index | inlinestats avg(doubleField) by ??field', []);
        for (const op of ['+', '-', '*', '/', '%']) {
          inlinestatsExpectErrors(
            `from a_index | inlinestats avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
            []
          );
        }
      });

      test('various errors', () => {
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField) by percentile(doubleField, 90)',
          ['Function [percentile] not allowed in [by]']
        );
        inlinestatsExpectErrors(
          'from a_index | inlinestats avg(doubleField) by textField, percentile(doubleField, 90) by ipField',
          ['Function [percentile] not allowed in [by]']
        );
      });

      describe('constant-only parameters', () => {
        test('no errors', () => {
          inlinestatsExpectErrors(
            'from index | inlinestats by bucket(dateField, 1 + 30 / 10, "", "")',
            []
          );
          inlinestatsExpectErrors(
            'from index | inlinestats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
            []
          );
        });

        test('errors', () => {
          inlinestatsExpectErrors('from index | inlinestats by bucket(dateField, pi(), "", "")', [
            getNoValidCallSignatureError('bucket', ['date', 'double', 'keyword', 'keyword']),
          ]);
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
              inlinestatsExpectErrors(
                `from a_index | inlinestats 5 + avg(doubleField) ${operatorsWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats 5 ${operatorsWrapping} + avg(doubleField)`,
                []
              );
            });
          });

          describe('EVAL', () => {
            const evalWrapping = Array(nesting).fill('round(').join('');
            const closingWrapping = Array(nesting).fill(')').join('');

            test('no errors', () => {
              inlinestatsExpectErrors(
                `from a_index | inlinestats ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats ${evalWrapping} sum(doubleField) ${closingWrapping} + ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats ${evalWrapping} sum(doubleField + doubleField) ${closingWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping} + ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats sum(${evalWrapping} doubleField ${closingWrapping} )`,
                []
              );
              inlinestatsExpectErrors(
                `from a_index | inlinestats sum(${evalWrapping} doubleField ${closingWrapping} ) + sum(${evalWrapping} doubleField ${closingWrapping} )`,
                []
              );
            });
          });
        });
      }
    });

    test('grammar: INLINESTATS BY without aggregate yields parse errors', () => {
      const { errors } = Parser.parse(
        'FROM index | INLINESTATS BY bucket(dateField, 1 + 30 / 10, "", "")'
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
