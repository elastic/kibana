/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../definitions/utils/test_mocks';
import { validate } from './validate';
import { expectErrors } from '../../../definitions/utils/test_functions';
import { timeUnitsToSuggest } from '../../../definitions/constants';
import { capitalize } from 'lodash';

const rowExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'row', validate);
};

describe('ROW Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    rowExpectErrors('row missing_column', ['Unknown column [missing_column]']);
    rowExpectErrors('row fn()', ['Unknown function [fn]']);
    rowExpectErrors('row missing_column, missing_column2', [
      'Unknown column [missing_column]',
      'Unknown column [missing_column2]',
    ]);
    rowExpectErrors('row col0=1', []);
    rowExpectErrors('row col0=1, missing_column', ['Unknown column [missing_column]']);
    rowExpectErrors('row col0=1, var0 = average()', ['Unknown function [average]']);
    rowExpectErrors('row col0 = [1, 2, 3]', []);
    rowExpectErrors('row col0 = [true, false]', []);
    rowExpectErrors('row col0 = ["a", "b"]', []);
    rowExpectErrors('row col0 = null', []);
    rowExpectErrors('row col0 = (1)', []);

    for (const bool of ['true', 'false']) {
      rowExpectErrors(`row col0=NOT ${bool}`, []);
      rowExpectErrors(`row NOT ${bool}`, []);
    }

    // test that "and" and "or" accept null... not sure if this is the best place or not...
    for (const op of ['and', 'or']) {
      for (const firstParam of ['true', 'null']) {
        for (const secondParam of ['false', 'null']) {
          rowExpectErrors(`row var0 = ${firstParam} ${op} ${secondParam}`, []);
        }
      }
    }

    for (const op of ['>', '>=', '<', '<=', '==', '!=']) {
      rowExpectErrors(`row col0 = 5 ${op} 0`, []);
      rowExpectErrors(`row col0 = NOT 5 ${op} 0`, []);
      rowExpectErrors(`row col0 = (field ${op} 0)`, ['Unknown column [field]']);
      rowExpectErrors(`row col0 = (NOT (5 ${op} 0))`, []);
      rowExpectErrors(`row col0 = to_ip("127.0.0.1") ${op} to_ip("127.0.0.1")`, []);
      rowExpectErrors(`row col0 = now() ${op} now()`, []);
      rowExpectErrors(
        `row col0 = false ${op} false`,
        ['==', '!='].includes(op)
          ? []
          : [
              `Argument of [${op}] must be [date], found value [false] type [boolean]`,
              `Argument of [${op}] must be [date], found value [false] type [boolean]`,
            ]
      );
      for (const [valueTypeA, valueTypeB] of [['now()', '"2022"']]) {
        rowExpectErrors(`row col0 = ${valueTypeA} ${op} ${valueTypeB}`, []);
        rowExpectErrors(`row col0 = ${valueTypeB} ${op} ${valueTypeA}`, []);
      }
    }

    for (const op of ['+', '-', '*', '/', '%']) {
      rowExpectErrors(`row col0 = 1 ${op} 1`, []);
      rowExpectErrors(`row col0 = (5 ${op} 1)`, []);
      rowExpectErrors(
        `row col0 = now() ${op} now()`,
        ['+', '-'].includes(op)
          ? [`Argument of [${op}] must be [date_period], found value [now()] type [date]`]
          : [
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
            ]
      );
    }

    for (const op of ['like', 'rlike']) {
      rowExpectErrors(`row col0 = "a" ${op} "?a"`, []);
      rowExpectErrors(`row col0 = "a" NOT ${op} "?a"`, []);
      rowExpectErrors(`row col0 = NOT "a" ${op} "?a"`, []);
      rowExpectErrors(`row col0 = NOT "a" NOT ${op} "?a"`, []);
      rowExpectErrors(`row col0 = 5 ${op} "?a"`, [
        `Argument of [${op}] must be [keyword], found value [5] type [integer]`,
      ]);
      rowExpectErrors(`row col0 = 5 NOT ${op} "?a"`, [
        `Argument of [not ${op}] must be [keyword], found value [5] type [integer]`,
      ]);
      rowExpectErrors(`row col0 = NOT 5 ${op} "?a"`, [
        `Argument of [${op}] must be [keyword], found value [5] type [integer]`,
      ]);
      rowExpectErrors(`row col0 = NOT 5 NOT ${op} "?a"`, [
        `Argument of [not ${op}] must be [keyword], found value [5] type [integer]`,
      ]);
    }

    rowExpectErrors(`row col0 = mv_sort(["a", "b"], "bogus")`, [
      'Invalid option ["bogus"] for mv_sort. Supported options: ["asc", "desc"].',
    ]);
    rowExpectErrors(`row col0 = mv_sort(["a", "b"], "ASC")`, []);
    rowExpectErrors(`row col0 = mv_sort(["a", "b"], "DESC")`, []);
  });

  describe('date math', () => {
    rowExpectErrors('row 1 anno', ['ROW does not support [date_period] in expression [1 anno]']);
    rowExpectErrors('row col0 = 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
    rowExpectErrors('row now() + 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
    for (const timeLiteral of timeUnitsToSuggest) {
      rowExpectErrors(`row 1 ${timeLiteral.name}`, [
        `ROW does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      ]);
      rowExpectErrors(`row 1                ${timeLiteral.name}`, [
        `ROW does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      ]);

      // this is not possible for now
      // rowExpectErrors(`row col0 = 1 ${timeLiteral.name}`, [
      //   `Row does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      // ]);
      rowExpectErrors(`row col0 = now() - 1 ${timeLiteral.name}`, []);
      rowExpectErrors(`row col0 = now() - 1 ${timeLiteral.name.toUpperCase()}`, []);
      rowExpectErrors(`row col0 = now() - 1 ${capitalize(timeLiteral.name)}`, []);
      rowExpectErrors(`row col0 = now() + 1 ${timeLiteral.name}`, []);
      rowExpectErrors(`row 1 ${timeLiteral.name} + 1 year`, []);
      for (const op of ['*', '/', '%']) {
        rowExpectErrors(`row col0 = now() ${op} 1 ${timeLiteral.name}`, [
          `Argument of [${op}] must be [double], found value [now()] type [date]`,
          `Argument of [${op}] must be [double], found value [1 ${timeLiteral.name}] type [duration]`,
        ]);
      }
    }
  });

  test('date_diff', () => {
    rowExpectErrors(
      'row col0 = date_diff("month", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
      []
    );
    rowExpectErrors(
      'row col0 = date_diff("mm", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
      []
    );
    rowExpectErrors(
      'row col0 = date_diff("bogus", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")',
      []
    );
  });
});
