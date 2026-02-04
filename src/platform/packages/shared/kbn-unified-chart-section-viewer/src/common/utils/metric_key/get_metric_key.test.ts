/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MetricField } from '../../../types';
import { getMetricKey, createMetricFieldsMap } from './get_metric_key';

describe('getMetricKey', () => {
  it('should generate key in format dataViewIndex::metricName', () => {
    expect(getMetricKey('metrics-*', 'system.cpu.user.pct')).toBe(
      'metrics-*::system.cpu.user.pct'
    );
  });

  it('should handle special characters in names', () => {
    expect(getMetricKey('logs-kubernetes-*', 'kubernetes.pod.cpu.usage.node.pct')).toBe(
      'logs-kubernetes-*::kubernetes.pod.cpu.usage.node.pct'
    );
  });

  it('should generate different keys for same metric name in different data views', () => {
    const key1 = getMetricKey('metrics-system-*', 'cpu.usage');
    const key2 = getMetricKey('metrics-kubernetes-*', 'cpu.usage');

    expect(key1).not.toBe(key2);
    expect(key1).toBe('metrics-system-*::cpu.usage');
    expect(key2).toBe('metrics-kubernetes-*::cpu.usage');
  });
});

describe('createMetricFieldsMap', () => {
  const createMockMetricField = (name: string, index: string): MetricField => ({
    name,
    index,
    type: ES_FIELD_TYPES.FLOAT,
    dimensions: [],
  });

  it('should create a Map with correct keys', () => {
    const fields: MetricField[] = [
      createMockMetricField('system.cpu.user.pct', 'metrics-*'),
      createMockMetricField('system.memory.used.pct', 'metrics-*'),
    ];

    const map = createMetricFieldsMap(fields);

    expect(map.size).toBe(2);
    expect(map.has('metrics-*::system.cpu.user.pct')).toBe(true);
    expect(map.has('metrics-*::system.memory.used.pct')).toBe(true);
  });

  it('should allow O(1) lookup by key', () => {
    const fields: MetricField[] = [
      createMockMetricField('system.cpu.user.pct', 'metrics-*'),
      createMockMetricField('system.memory.used.pct', 'metrics-*'),
      createMockMetricField('system.cpu.user.pct', 'other-index-*'), // Same name, different index
    ];

    const map = createMetricFieldsMap(fields);

    const key = getMetricKey('metrics-*', 'system.cpu.user.pct');
    const metric = map.get(key);

    expect(metric).toBeDefined();
    expect(metric?.name).toBe('system.cpu.user.pct');
    expect(metric?.index).toBe('metrics-*');
  });

  it('should handle metrics with same name but different data views', () => {
    const fields: MetricField[] = [
      createMockMetricField('cpu.usage', 'metrics-system-*'),
      createMockMetricField('cpu.usage', 'metrics-kubernetes-*'),
    ];

    const map = createMetricFieldsMap(fields);

    expect(map.size).toBe(2);

    const systemMetric = map.get('metrics-system-*::cpu.usage');
    const k8sMetric = map.get('metrics-kubernetes-*::cpu.usage');

    expect(systemMetric?.index).toBe('metrics-system-*');
    expect(k8sMetric?.index).toBe('metrics-kubernetes-*');
  });

  it('should return undefined for non-existent keys', () => {
    const fields: MetricField[] = [createMockMetricField('system.cpu.user.pct', 'metrics-*')];

    const map = createMetricFieldsMap(fields);

    expect(map.get('non-existent::field')).toBeUndefined();
  });

  it('should handle empty fields array', () => {
    const map = createMetricFieldsMap([]);

    expect(map.size).toBe(0);
  });
});
