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

  it('divides the nanoseconds of OTel as doubles, so that spans under a microsecond stay', () => {
    expect(commands).toContain('EVAL otel_duration_us = TO_DOUBLE(duration) / 1000');
  });

  it('casts each duration before the COALESCE, which then holds plain columns of one type', () => {
    expect(commands).toContain(
      'EVAL duration_us = COALESCE(transaction_duration_us, span_duration_us, otel_duration_us)'
    );
    expect(
      NORMALIZE_COMMANDS.findIndex((c) => c.includes('COALESCE(transaction_duration_us'))
    ).toBeGreaterThan(NORMALIZE_COMMANDS.findIndex((c) => c.includes('otel_duration_us = ')));
  });
});

describe('duration conditions', () => {
  it('select the same spans as their complement leaves out, in every family of fields', () => {
    expect(durationAtLeastCondition(8000)).toBe(
      'transaction.duration.us >= 8000 OR span.duration.us >= 8000 OR duration >= 8000000'
    );
    expect(durationBelowCondition(8000)).toBe(
      '(transaction.duration.us IS NULL OR transaction.duration.us < 8000) AND (span.duration.us IS NULL OR span.duration.us < 8000) AND (duration IS NULL OR duration < 8000000)'
    );
  });

  it('round the bounds up to whole units of each field', () => {
    expect(durationRangeCondition(1000.2, 5000)).toContain(
      '(duration >= 1000200 AND duration < 5000000)'
    );
    expect(durationRangeCondition(1000.2, 5000)).toContain('transaction.duration.us >= 1001');
  });
});
