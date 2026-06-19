/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../types';
import { getMetricUniqueKey } from './get_metric_unique_key';

const buildItem = (overrides: Partial<ParsedMetricItem> = {}): ParsedMetricItem => ({
  metricName: 'system.cpu.utilization',
  indexName: 'metrics-system.cpu-default',
  units: ['percent'],
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dimensionFields: [],
  ...overrides,
});

describe('getMetricUniqueKey', () => {
  it('joins indexName and metricName with the "::" separator', () => {
    expect(getMetricUniqueKey(buildItem())).toBe(
      'metrics-system.cpu-default::system.cpu.utilization'
    );
  });

  it('is stable for the same input', () => {
    const item = buildItem();
    expect(getMetricUniqueKey(item)).toBe(getMetricUniqueKey(item));
  });

  it('produces different keys when metricName differs', () => {
    expect(getMetricUniqueKey(buildItem({ metricName: 'a' }))).not.toBe(
      getMetricUniqueKey(buildItem({ metricName: 'b' }))
    );
  });

  it('produces different keys when indexName differs', () => {
    expect(getMetricUniqueKey(buildItem({ indexName: 'a' }))).not.toBe(
      getMetricUniqueKey(buildItem({ indexName: 'b' }))
    );
  });

  it('distinguishes metrics that share metricName across sources', () => {
    const a = buildItem({ indexName: 'metrics-host-default', metricName: 'cpu.usage' });
    const b = buildItem({ indexName: 'metrics-container-default', metricName: 'cpu.usage' });
    expect(getMetricUniqueKey(a)).not.toBe(getMetricUniqueKey(b));
  });

  it('ignores non-identifying fields', () => {
    const a = buildItem({ units: ['percent'] });
    const b = buildItem({ units: ['bytes'] });
    expect(getMetricUniqueKey(a)).toBe(getMetricUniqueKey(b));
  });

  // Elasticsearch caps both source names (index/data stream) and field names at
  // 255 characters, so the maximum key size is bounded at ~513 bytes
  // (255 + 2 for "::" + 255).
  it('handles maximum-length inputs without truncation', () => {
    const longIndexName = 'd'.repeat(255);
    const longMetricName = 'm'.repeat(255);
    const key = getMetricUniqueKey(
      buildItem({ indexName: longIndexName, metricName: longMetricName })
    );

    expect(key).toBe(`${longIndexName}::${longMetricName}`);
    expect(key.length).toBe(255 + 2 + 255);
  });

  // ES forbids ":" in source names, so the first "::" is always the delimiter
  // and the encoding stays injective even if metricName contains "::".
  it('stays injective when metricName contains "::"', () => {
    const a = buildItem({ indexName: 'metrics-system', metricName: 'a::b' });
    const b = buildItem({ indexName: 'metrics-system', metricName: 'a::c' });
    const c = buildItem({ indexName: 'metrics-system', metricName: 'a::b::c' });
    const d = buildItem({ indexName: 'metrics-other', metricName: 'a::b' });

    const keys = [a, b, c, d].map(getMetricUniqueKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
