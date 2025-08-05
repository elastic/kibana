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
import { timeUnits } from '../../../definitions/constants';
import { capitalize } from 'lodash';

const evalExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'eval', validate);
};

describe('EVAL Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    evalExpectErrors('from a_index | eval textField ', []);
    evalExpectErrors('from a_index | eval col0 = textField', []);
    evalExpectErrors('from a_index | eval doubleField + 1', []);
    evalExpectErrors('from a_index | eval textField + 1', [
      'Argument of [+] must be [double], found value [textField] type [text]',
    ]);
    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(doubleField) ', []);

    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(textField) ', [
      'Argument of [round] must be [double], found value [textField] type [text]',
    ]);
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(doubleField), doubleField  ',
      []
    );
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(doubleField), var0 = doubleField  ',
      []
    );

    evalExpectErrors('from a_index | eval col0=[1, 2, 3]', []);
    evalExpectErrors('from a_index | eval col0=[true, false]', []);
    evalExpectErrors('from a_index | eval col0=["a", "b"]', []);
    evalExpectErrors('from a_index | eval col0=null', []);
  });
  test('date_diff', () => {
    evalExpectErrors(
      'from a_index | eval date_diff(textField, "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
      []
    );
    evalExpectErrors(
      'from a_index | eval date_diff("month", dateField, "2023-12-02T11:00:00.000Z")',
      []
    );
    evalExpectErrors(
      'from a_index | eval date_diff("month", "2023-12-02T11:00:00.000Z", dateField)',
      []
    );
    evalExpectErrors('from a_index | eval date_diff("month", textField, dateField)', [
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
    evalExpectErrors('from a_index | eval date_diff("month", dateField, textField)', [
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
    evalExpectErrors(
      'from a_index | eval var0 = date_diff("year", to_datetime(textField), to_datetime(textField))',
      []
    );
    evalExpectErrors('from a_index | eval date_diff(doubleField, textField, textField)', [
      'Argument of [date_diff] must be [keyword], found value [doubleField] type [double]',
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
      'Argument of [date_diff] must be [date], found value [textField] type [text]',
    ]);
  });
  test('raises error on unknown field', () => {
    evalExpectErrors('from a_index | eval col0=b', ['Unknown column [b]']);
    evalExpectErrors('from a_index | eval col0=round', ['Unknown column [round]']);
    evalExpectErrors(
      'from a_index | eval col0=round(doubleField) + round(textField), doubleField  ',
      ['Argument of [round] must be [double], found value [textField] type [text]']
    );
  });
  test('validates IS NULL', () => {
    evalExpectErrors(`from a_index | eval doubleField IS NULL`, []);
    evalExpectErrors(`from a_index | eval doubleField IS NOT NULL`, []);
  });
  test('validates nesting', () => {
    const NESTING_LEVELS = 4;
    const NESTED_DEPTHS = Array(NESTING_LEVELS)
      .fill(0)
      .map((_, i) => i + 1);
    for (const nesting of NESTED_DEPTHS) {
      for (const evenOp of ['-', '+']) {
        for (const oddOp of ['-', '+']) {
          // This builds a combination of +/- operators
          // i.e. ---- something, -+-+ something, +-+- something, etc...
          const unaryCombination = Array(nesting)
            .fill('- ')
            .map((_, i) => (i % 2 ? oddOp : evenOp))
            .join('');
          evalExpectErrors(`from a_index | eval ${unaryCombination} doubleField`, []);
          evalExpectErrors(`from a_index | eval col0=${unaryCombination} doubleField`, []);
          evalExpectErrors(`from a_index | eval col0=${unaryCombination} round(doubleField)`, []);
          evalExpectErrors(`from a_index | eval 1 + ${unaryCombination} doubleField`, []);
          // still valid
          evalExpectErrors(`from a_index | eval 1 ${unaryCombination} doubleField`, []);
        }
      }

      evalExpectErrors(
        `from a_index | eval ${Array(nesting).fill('not ').join('')} booleanField`,
        []
      );
    }
  });

  test('rest validations', () => {
    const newUserDefinedColumns = new Map(mockContext.userDefinedColumns);
    newUserDefinedColumns.set('avg(doubleField)', [
      {
        name: 'avg(doubleField)',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    const context = {
      ...mockContext,
      userDefinedColumns: newUserDefinedColumns,
    };
    evalExpectErrors('from a_index | eval avg(doubleField)', [
      'EVAL does not support function avg',
    ]);
    evalExpectErrors(
      'from a_index | stats avg(doubleField) | eval `avg(doubleField)` + 1',
      [],
      context
    );
    evalExpectErrors('from a_index | eval not', [
      'Error: [not] function expects exactly one argument, got 0.',
    ]);

    evalExpectErrors('from a_index | eval mv_sort(["a", "b"], "bogus")', [
      'Invalid option ["bogus"] for mv_sort. Supported options: ["asc", "desc"].',
    ]);

    evalExpectErrors(`from a_index | eval mv_sort(["a", "b"], "ASC")`, []);
    evalExpectErrors(`from a_index | eval mv_sort(["a", "b"], "DESC")`, []);

    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1), round(col0)`, []);
    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1) | stats sum(col0)`, []);
    evalExpectErrors(`from a_index | eval col0 = case(false, 0, 1) | stats col0 = sum(col0)`, []);
    evalExpectErrors(`from a_index | eval round(case(false, 0, 1))`, []);
  });

  test('date math', () => {
    evalExpectErrors('from a_index | eval 1 anno', [
      'EVAL does not support [date_period] in expression [1 anno]',
    ]);
    evalExpectErrors('from a_index | eval col0 = 1 anno', [
      "Unexpected time interval qualifier: 'anno'",
    ]);
    evalExpectErrors('from a_index | eval now() + 1 anno', [
      "Unexpected time interval qualifier: 'anno'",
    ]);
    for (const unit of timeUnits) {
      evalExpectErrors(`from a_index | eval 1 ${unit}`, [
        `EVAL does not support [date_period] in expression [1 ${unit}]`,
      ]);
      evalExpectErrors(`from a_index | eval 1                ${unit}`, [
        `EVAL does not support [date_period] in expression [1 ${unit}]`,
      ]);

      // this is not possible for now
      // evalExpectErrors(`from a_index | eval col0 = 1 ${timeLiteral.name}`, [
      //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      // ]);
      evalExpectErrors(`from a_index | eval col0 = now() - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit.toUpperCase()}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${capitalize(unit)}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField + 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval 1 ${unit} + 1 year`, []);
      for (const op of ['*', '/', '%']) {
        evalExpectErrors(`from a_index | eval col0 = now() ${op} 1 ${unit}`, [
          `Argument of [${op}] must be [double], found value [now()] type [date]`,
          `Argument of [${op}] must be [double], found value [1 ${unit}] type [duration]`,
        ]);
      }
    }
  });
});
