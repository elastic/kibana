/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { mockContext } from '../../../__tests__/commands/context_fixtures';

const promqlExpectErrors = (query: string, expected: string[]) =>
  expectErrors(query, expected, mockContext, 'promql', validate);

describe('PROMQL Validation', () => {
  describe('required params', () => {
    test.each([
      [
        'missing step param',
        'PROMQL index=timeseries_index start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        '[PROMQL] Missing required param "step"',
      ],
      [
        'missing start param',
        'PROMQL index=timeseries_index step=5m end=?_tend (rate(counterIntegerField[5m]))',
        '[PROMQL] Missing required param "start"',
      ],
      [
        'missing end param',
        'PROMQL index=timeseries_index step=5m start=?_tstart (rate(counterIntegerField[5m]))',
        '[PROMQL] Missing required param "end"',
      ],
    ])('%s', (_title, query, error) => {
      promqlExpectErrors(query, [error]);
    });
  });

  describe('param values', () => {
    test('invalid step format', () => {
      promqlExpectErrors(
        'PROMQL step=abc start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        ['[PROMQL] Invalid step value']
      );
    });

    test.each([
      [
        'invalid start date format',
        'PROMQL step=5m start=invalid end=?_tend (rate(counterIntegerField[5m]))',
        '[PROMQL] Invalid start value. Use ISO 8601 with Z (e.g. 2024-01-15T10:00:00Z) or ?_tstart/?_tend',
      ],
      [
        'invalid end date format',
        'PROMQL step=5m start=?_tstart end=invalid (rate(counterIntegerField[5m]))',
        '[PROMQL] Invalid end value. Use ISO 8601 with Z (e.g. 2024-01-15T10:00:00Z) or ?_tstart/?_tend',
      ],
    ])('%s', (_title, query, error) => {
      promqlExpectErrors(query, [error]);
    });
  });

  describe('query presence', () => {
    test('missing query', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend', ['[PROMQL] Missing query']);
    });

    test('named query with parens', () => {
      promqlExpectErrors(
        'PROMQL step=5m start=?_tstart end=?_tend col0=(rate(counterIntegerField[5m]))',
        []
      );
    });
  });

  describe('index validation', () => {
    test('unknown index', () => {
      promqlExpectErrors(
        'PROMQL index=unknown_xyz step=5m start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        ['Unknown index "unknown_xyz"']
      );
    });

    test('unknown index with missing query', () => {
      promqlExpectErrors('PROMQL step="5m" index=hh', [
        'Unknown index "hh"',
        '[PROMQL] Missing query',
      ]);
    });

    test('multiple indexes - one invalid', () => {
      promqlExpectErrors(
        'PROMQL index=timeseries_index,unknown_xyz step=5m start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        ['Unknown index "unknown_xyz"']
      );
    });

    test('wildcard index', () => {
      promqlExpectErrors(
        'PROMQL index=timeseries_* step=5m start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        []
      );
    });

    test('invalid wildcard index', () => {
      promqlExpectErrors(
        'PROMQL index=unknown_* step=5m start=?_tstart end=?_tend (rate(counterIntegerField[5m]))',
        ['Unknown index "unknown_*"']
      );
    });
  });

  describe('query semantics', () => {
    test('typo function name does not become unknown index', () => {
      promqlExpectErrors('PROMQL step = "5m" quantjile(0xc)', [
        '[PROMQL] Unknown function "quantjile"',
      ]);
    });

    test('unknown index and unknown function are cumulative', () => {
      promqlExpectErrors(
        'PROMQL index=unknown_xyz step=5m start=?_tstart end=?_tend (unknown_fn(counterIntegerField[5m]))',
        ['Unknown index "unknown_xyz"', '[PROMQL] Unknown function "unknown_fn"']
      );
    });

    test.each([
      [
        'unknown metric name reports unknown column',
        'PROMQL index=timeseries_index step=5m start=?_tstart end=?_tend (rate(bytess[5m]))',
        ['Unknown column "bytess"'],
      ],
      [
        'unknown metric name without index reports unknown column',
        'PROMQL step=5m (rate(bytes))',
        [
          '[PROMQL] Argument types require (v=range_vector) for function "rate"',
          'Unknown column "bytes"',
        ],
      ],
    ])('%s', (_title, query, expected) => {
      promqlExpectErrors(query, expected);
    });

    test('grouping is not allowed on non-aggregation functions', () => {
      promqlExpectErrors(
        'PROMQL step=5m start=?_tstart end=?_tend (rate by (textField) (counterIntegerField[5m]))',
        ['[PROMQL] Grouping is only allowed on aggregation']
      );
    });

    test('type mismatch: rate expects range vector', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend (rate(counterIntegerField))', [
        '[PROMQL] Argument types require (v=range_vector) for function "rate"',
      ]);
    });

    test('type mismatch: quantile expects scalar as first arg', () => {
      promqlExpectErrors(
        'PROMQL step=5m start=?_tstart end=?_tend (quantile("0.5", counterIntegerField))',
        ['[PROMQL] Argument types require (φ=scalar, v=instant_vector) for function "quantile"']
      );
    });

    test('nested function return type is normalized for signature matching', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend (quantile(0.5, vector(1)))', []);
    });

    test('type mismatch: binary operator with incompatible types', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend ("string" + "string")', [
        '[PROMQL] Argument types require (lhs=instant_vector, rhs=instant_vector) for function "+"',
      ]);
    });

    test('type mismatch: range_vector arithmetic not supported', () => {
      promqlExpectErrors(
        'PROMQL step=5m start=?_tstart end=?_tend (doubleField[5m] + doubleField[5m])',
        [
          '[PROMQL] Argument types require (lhs=instant_vector, rhs=instant_vector) for function "+"',
        ]
      );
    });

    test('type mismatch: instant_vector with range_vector operand', () => {
      promqlExpectErrors(
        'PROMQL step=5m start=?_tstart end=?_tend (doubleField + doubleField[5m])',
        [
          '[PROMQL] Argument types require (lhs=instant_vector, rhs=instant_vector) for function "+"',
        ]
      );
    });
  });
});
