/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { indexPatternToCcs } from './index_pattern_to_ccs';

describe('indexPatternToCcs', () => {
  it('expands a simple local pattern', () => {
    const result = indexPatternToCcs('logs-*');
    expect(result).toEqual(['logs-*', '*:logs-*']);
  });

  it('returns remote-cluster pattern untouched', () => {
    const result = indexPatternToCcs('prod:logs-*');
    expect(result).toEqual(['prod:logs-*']);
  });

  it('returns wildcard-cluster pattern untouched', () => {
    const result = indexPatternToCcs('*:metrics-*');
    expect(result).toEqual(['*:metrics-*']);
  });

  it('expands local failure-store pattern', () => {
    const result = indexPatternToCcs('logs-*::failures');
    expect(result).toEqual(['logs-*::failures', '*:logs-*::failures']);
  });

  it('handles array input and deduplication', () => {
    const result = indexPatternToCcs(['logs-*', 'prod:metrics-*', '*:logs-*']);
    expect(result).toEqual(['logs-*', '*:logs-*', 'prod:metrics-*']);
  });

  it('splits comma-separated string', () => {
    const result = indexPatternToCcs('logs-*, metrics-*');
    expect(result).toEqual(['logs-*', '*:logs-*', 'metrics-*', '*:metrics-*']);
  });
});
