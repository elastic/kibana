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
    test('no errors with all required params', () => {
      promqlExpectErrors(
        'PROMQL index=metrics step=5m start=?_tstart end=?_tend (rate(http_requests[5m]))',
        []
      );
    });

    test.each([
      [
        'missing step param',
        'PROMQL index=metrics start=?_tstart end=?_tend (rate(x[5m]))',
        '[PROMQL] Missing required param "step"',
      ],
      [
        'missing start param',
        'PROMQL index=metrics step=5m end=?_tend (rate(x[5m]))',
        '[PROMQL] Missing required param "start"',
      ],
      [
        'missing end param',
        'PROMQL index=metrics step=5m start=?_tstart (rate(x[5m]))',
        '[PROMQL] Missing required param "end"',
      ],
    ])('%s', (_title, query, error) => {
      promqlExpectErrors(query, [error]);
    });
  });

  describe('param values', () => {
    test('invalid step format', () => {
      promqlExpectErrors('PROMQL step=abc start=?_tstart end=?_tend (rate(x[5m]))', [
        '[PROMQL] Invalid step value',
      ]);
    });

    test.each([
      [
        'invalid start date format',
        'PROMQL step=5m start=invalid end=?_tend (rate(x[5m]))',
        '[PROMQL] Invalid start value. Use ISO 8601 with Z (e.g. 2024-01-15T10:00:00Z) or ?_tstart/?_tend',
      ],
      [
        'invalid end date format',
        'PROMQL step=5m start=?_tstart end=invalid (rate(x[5m]))',
        '[PROMQL] Invalid end value. Use ISO 8601 with Z (e.g. 2024-01-15T10:00:00Z) or ?_tstart/?_tend',
      ],
    ])('%s', (_title, query, error) => {
      promqlExpectErrors(query, [error]);
    });

    test('valid ISO date for start', () => {
      promqlExpectErrors(
        'PROMQL step=5m start="2024-01-15T10:00:00Z" end=?_tend (rate(x[5m]))',
        []
      );
    });

    test('start >= end error', () => {
      promqlExpectErrors(
        'PROMQL step=5m start="2024-01-15T10:00:00Z" end="2024-01-14T10:00:00Z" (rate(x[5m]))',
        ['[PROMQL] Start must be earlier than end']
      );
    });
  });

  describe('query presence', () => {
    test('missing query', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend', ['[PROMQL] Missing query']);
    });

    test('named query without parens', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend col0=rate(x[5m])', [
        '[PROMQL] Named query must use parentheses: name=(query)',
      ]);
    });

    test('named query with parens', () => {
      promqlExpectErrors('PROMQL step=5m start=?_tstart end=?_tend col0=(rate(x[5m]))', []);
    });
  });
});
