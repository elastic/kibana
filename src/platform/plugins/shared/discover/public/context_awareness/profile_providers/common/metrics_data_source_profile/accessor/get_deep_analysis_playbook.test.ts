/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDeepAnalysisPlaybook } from './get_deep_analysis_playbook';

describe('getDeepAnalysisPlaybook (metrics)', () => {
  const invoke = () => {
    const accessor = getDeepAnalysisPlaybook!(() => undefined, { context: {} as never });
    return accessor({ dataView: undefined, query: undefined });
  };

  it('returns the metrics contribution with TS_INFO guidance', () => {
    const result = invoke();

    expect(result?.shapeId).toBe('metrics');
    expect(result?.characteristicFields).toEqual(['@timestamp']);
    expect(result?.promptAddendum).toContain('TS_INFO');
    expect(result?.promptAddendum).toContain('metric_name');
    expect(result?.promptAddendum).toContain('dimension_fields');
    expect(result?.promptAddendum).toMatch(/TS </);
    expect(result?.promptAddendum).toMatch(/never `?FROM/);
    expect(result?.promptAddendum.length).toBeLessThanOrEqual(600);
    expect((result?.interestingSignals ?? []).length).toBeLessThanOrEqual(5);
  });
});
