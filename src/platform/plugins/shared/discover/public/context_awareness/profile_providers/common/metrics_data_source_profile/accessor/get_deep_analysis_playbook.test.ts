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
  const invokeWith = (columns?: Array<{ name: string; type?: string }>) => {
    const accessor = getDeepAnalysisPlaybook!(() => undefined, { context: {} as never });
    return accessor({ dataView: undefined, query: undefined, columns });
  };

  it('returns a metrics shape contribution with @timestamp and detected numeric columns', () => {
    const result = invokeWith([
      { name: '@timestamp', type: 'date' },
      { name: 'cpu.usage', type: 'double' },
      { name: 'memory.bytes', type: 'long' },
      { name: 'host.name', type: 'keyword' },
    ]);

    expect(result?.shapeId).toBe('metrics');
    expect(result?.characteristicFields).toEqual(['@timestamp', 'cpu.usage', 'memory.bytes']);
    expect(result?.promptAddendum).toMatch(/BUCKET/);
    expect(result?.promptAddendum.length).toBeLessThanOrEqual(600);
  });

  it('falls back to just @timestamp when no columns are provided', () => {
    const result = invokeWith();

    expect(result?.characteristicFields).toEqual(['@timestamp']);
  });

  it('skips columns whose type is undefined', () => {
    const result = invokeWith([{ name: 'cpu.usage', type: 'double' }, { name: 'unknown_field' }]);

    expect(result?.characteristicFields).toEqual(['@timestamp', 'cpu.usage']);
  });
});
