/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { getDeepAnalysisPlaybook } from './get_deep_analysis_playbook';

describe('getDeepAnalysisPlaybook (metrics)', () => {
  const invoke = () => {
    const accessor = getDeepAnalysisPlaybook!(() => undefined, {
      context: {} as never,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    });
    return accessor({ dataView: undefined, query: undefined });
  };

  it('returns the metrics contribution with TS_INFO guidance', () => {
    const result = invoke();

    expect(result?.shapeId).toBe('metrics');
    expect(result?.characteristicFields).toEqual(['@timestamp']);
    expect(result?.guidance).toContain('TS_INFO');
    expect(result?.guidance).toContain('metric_name');
    expect(result?.guidance).toContain('dimension_fields');
    expect(result?.guidance).toMatch(/TS </);
    expect(result?.guidance).toMatch(/never `?FROM/);
    expect(result?.guidance.length).toBeLessThanOrEqual(600);
    expect((result?.interestingSignals ?? []).length).toBeLessThanOrEqual(5);
  });
});
