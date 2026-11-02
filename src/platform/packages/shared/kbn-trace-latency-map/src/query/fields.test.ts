/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  NORMALIZE_COMMANDS,
  durationAtLeastCondition,
  durationBelowCondition,
  durationRangeCondition,
} from './fields';

describe('NORMALIZE_COMMANDS', () => {
  const commands = NORMALIZE_COMMANDS.join('\n');

  it('takes the nanoseconds of OTel as they are, and multiplies the microseconds of APM', () => {
    expect(commands).toContain('EVAL otel_duration_ns = TO_DOUBLE(duration)');
    expect(commands).toContain(
      'EVAL transaction_duration_ns = TO_DOUBLE(transaction.duration.us) * 1000'
    );
    expect(commands).toContain('EVAL span_duration_ns = TO_DOUBLE(span.duration.us) * 1000');
  });

  it('casts each duration before the COALESCE, which then holds plain columns of one type', () => {
    expect(commands).toContain(
      'EVAL duration_ns = COALESCE(transaction_duration_ns, span_duration_ns, otel_duration_ns)'
    );
    expect(
      NORMALIZE_COMMANDS.findIndex((c) => c.includes('COALESCE(transaction_duration_ns'))
    ).toBeGreaterThan(NORMALIZE_COMMANDS.findIndex((c) => c.includes('otel_duration_ns = ')));
  });
});

describe('duration conditions', () => {
  it('select the same spans as their complement leaves out, in every family of fields', () => {
    expect(durationAtLeastCondition(8_000_000)).toBe(
      'transaction.duration.us >= 8000 OR span.duration.us >= 8000 OR duration >= 8000000'
    );
    expect(durationBelowCondition(8_000_000)).toBe(
      '(transaction.duration.us IS NULL OR transaction.duration.us < 8000) AND (span.duration.us IS NULL OR span.duration.us < 8000) AND (duration IS NULL OR duration < 8000000)'
    );
  });

  it('round the bounds up to whole units of each field', () => {
    expect(durationRangeCondition(1_000_200, 5_000_000)).toContain(
      '(duration >= 1000200 AND duration < 5000000)'
    );
    expect(durationRangeCondition(1_000_200, 5_000_000)).toContain(
      'transaction.duration.us >= 1001'
    );
  });
});
