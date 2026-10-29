/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectionToEsqlCondition } from './to_esql';

const selection = {
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDurationUs: 1000.2,
  maxDurationUs: 5000,
};

describe('selectionToEsqlCondition', () => {
  it('selects the time window and the duration range of every family of duration fields', () => {
    expect(selectionToEsqlCondition(selection)).toBe(
      [
        '@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z")',
        '@timestamp < TO_DATETIME("2026-10-26T10:05:00.000Z")',
        '((transaction.duration.us >= 1001 AND transaction.duration.us < 5000) OR (span.duration.us >= 1001 AND span.duration.us < 5000) OR (duration >= 1000200 AND duration < 5000000))',
      ].join(' AND ')
    );
  });

  it('keeps OTel nanoseconds exact', () => {
    expect(
      selectionToEsqlCondition({ ...selection, minDurationUs: 2, maxDurationUs: 3 })
    ).toContain('(duration >= 2000 AND duration < 3000)');
  });

  it('adds the failed spans condition for a selection about failures', () => {
    expect(selectionToEsqlCondition({ ...selection, failedOnly: true })).toMatch(
      /AND \(event\.outcome == "failure" OR status\.code == "Error"\)$/
    );
  });

  it('selects the root spans of a map of traces, and carries the scope of a scoped map', () => {
    expect(
      selectionToEsqlCondition(selection, {
        unit: 'traces',
        scope: 'service.name == "cart" OR service.name == "checkout"',
      })
    ).toMatch(
      /AND \(parent\.id IS NULL AND parent_span_id IS NULL\) AND \(service\.name == "cart" OR service\.name == "checkout"\)$/
    );
  });

  it('refuses an invalid timestamp instead of building a broken query', () => {
    expect(() => selectionToEsqlCondition({ ...selection, from: 'now-15m' })).toThrow(RangeError);
  });
});
