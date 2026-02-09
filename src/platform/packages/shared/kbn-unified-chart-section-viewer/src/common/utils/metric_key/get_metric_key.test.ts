/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMetricKey } from './get_metric_key';

describe('getMetricKey', () => {
  it('should generate key in format dataViewIndex::metricName', () => {
    expect(getMetricKey('metrics-*', 'system.cpu.user.pct')).toBe('metrics-*::system.cpu.user.pct');
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
