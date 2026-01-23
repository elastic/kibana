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
      getNoValidCallSignatureError('+', ['text', 'integer']),
    ]);
    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(doubleField) ', []);

    evalExpectErrors('from a_index | eval col0=round(doubleField) + round(textField) ', [
      getNoValidCallSignatureError('round', ['text']),
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
  test('raises error on unknown field', () => {
    evalExpectErrors('from a_index | eval col0=b', ['Unknown column "b"']);
    evalExpectErrors('from a_index | eval col0=round', ['Unknown column "round"']);
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

  test('date math', () => {
    for (const unit of [...TIME_DURATION_UNITS, ...DATE_PERIOD_UNITS]) {
      // this is not possible for now
      // evalExpectErrors(`from a_index | eval col0 = 1 ${timeLiteral.name}`, [
      //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
      // ]);
      evalExpectErrors(`from a_index | eval col0 = now() - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${unit.toUpperCase()}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField - 1 ${capitalize(unit)}`, []);
      evalExpectErrors(`from a_index | eval col0 = dateField + 1 ${unit}`, []);
    }

    for (const unit of TIME_DURATION_UNITS)
      for (const op of ['*', '/', '%']) {
        evalExpectErrors(`from a_index | eval col0 = now() ${op} 1 ${unit}`, [
          getNoValidCallSignatureError(op, ['date', 'time_duration']),
        ]);
      }

    for (const unit of DATE_PERIOD_UNITS)
      for (const op of ['*', '/', '%']) {
        evalExpectErrors(`from a_index | eval col0 = now() ${op} 1 ${unit}`, [
          getNoValidCallSignatureError(op, ['date', 'date_period']),
        ]);
      }
  });
});
