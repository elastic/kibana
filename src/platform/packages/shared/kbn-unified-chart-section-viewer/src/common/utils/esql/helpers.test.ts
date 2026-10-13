/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldNameToColumn, resolveSource } from './helpers';

describe('resolveSource', () => {
  it('keeps the user source when it is a single concrete index', () => {
    expect(resolveSource('.ds-metrics-a-2026.09.28-000001', 'metrics-a')).toBe(
      '.ds-metrics-a-2026.09.28-000001'
    );
  });

  it('falls back to the metric index for a wildcard pattern', () => {
    expect(resolveSource('metrics-*', 'metrics-a')).toBe('metrics-a');
  });

  it('falls back to the metric index for a comma-separated source', () => {
    expect(resolveSource('metrics-a, metrics-b', 'metrics-b')).toBe('metrics-b');
  });

  it('falls back to the metric index when the source is undefined', () => {
    expect(resolveSource(undefined, 'metrics-a')).toBe('metrics-a');
  });
});

describe('fieldNameToColumn', () => {
  it('builds a column from a dotted field name', () => {
    expect(fieldNameToColumn('system.cpu.total').name).toBe('system.cpu.total');
  });

  it('escapes segments that need backticks', () => {
    expect(fieldNameToColumn('latency.p-99').name).toBe('latency.`p-99`');
  });
});
