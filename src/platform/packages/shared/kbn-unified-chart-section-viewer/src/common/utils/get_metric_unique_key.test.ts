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
  dataStream: 'metrics-system.cpu-default',
  units: ['percent'],
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dimensionFields: [],
  ...overrides,
});

describe('getMetricUniqueKey', () => {
  it('joins dataStream and metricName with the "::" separator', () => {
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

  it('produces different keys when dataStream differs', () => {
    expect(getMetricUniqueKey(buildItem({ dataStream: 'a' }))).not.toBe(
      getMetricUniqueKey(buildItem({ dataStream: 'b' }))
    );
  });

  it('distinguishes metrics that share metricName across data streams', () => {
    const a = buildItem({ dataStream: 'metrics-host-default', metricName: 'cpu.usage' });
    const b = buildItem({ dataStream: 'metrics-container-default', metricName: 'cpu.usage' });
    expect(getMetricUniqueKey(a)).not.toBe(getMetricUniqueKey(b));
  });

  it('ignores non-identifying fields', () => {
    const a = buildItem({ units: ['percent'] });
    const b = buildItem({ units: ['bytes'] });
    expect(getMetricUniqueKey(a)).toBe(getMetricUniqueKey(b));
  });

  // Elasticsearch caps both data stream names and field names at 255 characters,
  // so the maximum key size is bounded at ~513 bytes (255 + 2 for "::" + 255).
  it('handles maximum-length inputs without truncation', () => {
    const longDataStream = 'd'.repeat(255);
    const longMetricName = 'm'.repeat(255);
    const key = getMetricUniqueKey(
      buildItem({ dataStream: longDataStream, metricName: longMetricName })
    );

    expect(key).toBe(`${longDataStream}::${longMetricName}`);
    expect(key.length).toBe(255 + 2 + 255);
  });

  it('remains parseable when metricName contains ":" (dataStream cannot per ES rules)', () => {
    const a = buildItem({ dataStream: 'metrics-system', metricName: 'a::b' });
    const b = buildItem({ dataStream: 'metrics-system', metricName: 'a:b' });
    expect(getMetricUniqueKey(a)).not.toBe(getMetricUniqueKey(b));
  });
});
