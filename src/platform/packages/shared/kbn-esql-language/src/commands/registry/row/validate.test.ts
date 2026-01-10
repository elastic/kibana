/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { capitalize } from 'lodash';
import { DATE_PERIOD_UNITS, TIME_DURATION_UNITS } from '../../../parser';
import { getNoValidCallSignatureError } from '../../definitions/utils/validation/utils';

const rowExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'row', validate);
};

describe('ROW Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    rowExpectErrors('row missing_column', ['Unknown column "missing_column"']);
    rowExpectErrors('row fn()', ['Unknown function FN']);
    rowExpectErrors('row missing_column, missing_column2', [
      'Unknown column "missing_column"',
      'Unknown column "missing_column2"',
    ]);
    rowExpectErrors('row col0=1', []);
    rowExpectErrors('row col0=1, missing_column', ['Unknown column "missing_column"']);
    rowExpectErrors('row col0=1, var0 = average()', ['Unknown function AVERAGE']);
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
      rowExpectErrors(`row col0 = (field ${op} 0)`, ['Unknown column "field"']);
      rowExpectErrors(`row col0 = (NOT (5 ${op} 0))`, []);
      rowExpectErrors(`row col0 = to_ip("127.0.0.1") ${op} to_ip("127.0.0.1")`, []);
      rowExpectErrors(`row col0 = now() ${op} now()`, []);
      rowExpectErrors(
        `row col0 = false ${op} false`,
        ['==', '!='].includes(op) ? [] : [getNoValidCallSignatureError(op, ['boolean', 'boolean'])]
      );
      for (const [valueTypeA, valueTypeB] of [['now()', '"2022"']]) {
        rowExpectErrors(`row col0 = ${valueTypeA} ${op} ${valueTypeB}`, []);
        rowExpectErrors(`row col0 = ${valueTypeB} ${op} ${valueTypeA}`, []);
      }
    }

    for (const op of ['+', '-', '*', '/', '%']) {
      rowExpectErrors(`row col0 = 1 ${op} 1`, []);
      rowExpectErrors(`row col0 = (5 ${op} 1)`, []);
      rowExpectErrors(`row col0 = now() ${op} now()`, [
        getNoValidCallSignatureError(op, ['date', 'date']),
      ]);
    }

    for (const op of ['like', 'rlike']) {
      rowExpectErrors(`row col0 = "a" ${op} "?a"`, []);
      rowExpectErrors(`row col0 = "a" NOT ${op} "?a"`, []);
      rowExpectErrors(`row col0 = NOT "a" ${op} "?a"`, []);
      rowExpectErrors(`row col0 = NOT "a" NOT ${op} "?a"`, []);
      rowExpectErrors(`row col0 = 5 ${op} "?a"`, [
        getNoValidCallSignatureError(op, ['integer', 'keyword']),
      ]);
      rowExpectErrors(`row col0 = 5 NOT ${op} "?a"`, [
        getNoValidCallSignatureError(`not ${op}`, ['integer', 'keyword']),
      ]);
      rowExpectErrors(`row col0 = NOT 5 ${op} "?a"`, [
        getNoValidCallSignatureError(op, ['integer', 'keyword']),
      ]);
      rowExpectErrors(`row col0 = NOT 5 NOT ${op} "?a"`, [
        getNoValidCallSignatureError(`not ${op}`, ['integer', 'keyword']),
      ]);
    }
  });

  test('date math', () => {
    for (const unit of [...TIME_DURATION_UNITS, ...DATE_PERIOD_UNITS]) {
      // this is not possible for now
      // rowExpectErrors(`row col0 = 1 ${unit}`, [
      //   `Row does not support [date_period] in expression [1 ${unit}]`,
      // ]);
      rowExpectErrors(`row col0 = now() - 1 ${unit}`, []);
      rowExpectErrors(`row col0 = now() - 1 ${unit.toUpperCase()}`, []);
      rowExpectErrors(`row col0 = now() - 1 ${capitalize(unit)}`, []);
      rowExpectErrors(`row col0 = now() + 1 ${unit}`, []);
    }

    for (const unit of TIME_DURATION_UNITS)
      for (const op of ['*', '/', '%']) {
        rowExpectErrors(`ROW col0 = now() ${op} 1 ${unit}`, [
          getNoValidCallSignatureError(op, ['date', 'time_duration']),
        ]);
      }

    for (const unit of DATE_PERIOD_UNITS)
      for (const op of ['*', '/', '%']) {
        rowExpectErrors(`ROW col0 = now() ${op} 1 ${unit}`, [
          getNoValidCallSignatureError(op, ['date', 'date_period']),
        ]);
      }
  });
});
