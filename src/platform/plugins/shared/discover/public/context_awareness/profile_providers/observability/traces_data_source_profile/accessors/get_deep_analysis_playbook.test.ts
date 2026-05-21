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

describe('getDeepAnalysisPlaybook (traces)', () => {
  const invokeWith = (columns?: Array<{ name: string; type?: string }>) => {
    const accessor = getDeepAnalysisPlaybook!(() => undefined, {
      context: {} as never,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    });
    return accessor({ dataView: undefined, query: undefined, columns });
  };

  it('returns the ECS contribution for ECS-style traces', () => {
    const result = invokeWith([
      { name: '@timestamp', type: 'date' },
      { name: 'service.name', type: 'keyword' },
      { name: 'transaction.name', type: 'keyword' },
      { name: 'event.outcome', type: 'keyword' },
    ]);

    expect(result?.shapeId).toBe('traces');
    expect(result?.shapeLabel).toMatch(/ECS/);
    expect(result?.guidance).toContain('transaction.duration.us');
    expect(result?.guidance).toContain('span.duration.us');
    expect(result?.guidance).toContain('event.outcome');
    expect(result?.guidance.length).toBeLessThanOrEqual(600);
  });

  it('returns the OTel contribution when columns include `kind`', () => {
    const result = invokeWith([
      { name: '@timestamp', type: 'date' },
      { name: 'service.name', type: 'keyword' },
      { name: 'kind', type: 'keyword' },
      { name: 'duration', type: 'long' },
    ]);

    expect(result?.shapeId).toBe('traces-otel');
    expect(result?.shapeLabel).toMatch(/OTel/);
    expect(result?.guidance).toContain('status.code');
    expect(result?.guidance).toContain('kind');
    expect(result?.guidance).not.toContain('event.outcome');
    expect(result?.guidance.length).toBeLessThanOrEqual(600);
  });

  it('returns the ECS contribution when OTel signals coexist with processor.event (APM-processed)', () => {
    const result = invokeWith([
      { name: '@timestamp', type: 'date' },
      { name: 'kind', type: 'keyword' },
      { name: 'duration', type: 'long' },
      { name: 'processor.event', type: 'keyword' },
      { name: 'transaction.name', type: 'keyword' },
    ]);

    expect(result?.shapeId).toBe('traces');
    expect(result?.shapeLabel).toMatch(/ECS/);
  });

  it('returns the OTel contribution when columns include `attributes.*`', () => {
    const result = invokeWith([
      { name: '@timestamp', type: 'date' },
      { name: 'attributes.http.method', type: 'keyword' },
    ]);

    expect(result?.shapeId).toBe('traces-otel');
  });

  it('exposes the union of ECS and OTel trace fields as characteristicFields', () => {
    const result = invokeWith([{ name: 'kind', type: 'keyword' }]);

    expect(result?.characteristicFields).toEqual(
      expect.arrayContaining([
        '@timestamp',
        'service.name',
        // ECS
        'transaction.name',
        'transaction.duration.us',
        'event.outcome',
        // OTel
        'kind',
        'duration',
        'status.code',
      ])
    );
  });

  it('falls back to ECS when columns are not provided', () => {
    const result = invokeWith();

    expect(result?.shapeId).toBe('traces');
  });
});
