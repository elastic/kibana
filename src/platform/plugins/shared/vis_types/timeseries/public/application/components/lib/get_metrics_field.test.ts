/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMetricsField } from './get_metrics_field';
import type { Metric } from '../../../../common/types';

describe('getMetricsField(metrics)', () => {
  it('should return last metric field', () => {
    const metrics = [
      { id: 'some-id', type: 'avg', field: 'some field' },
      { id: 'another-id', type: 'sum_bucket', field: 'some-id' },
      { id: 'one-more-id', type: 'top_hit', field: 'one more field' },
    ] as Metric[];

    const field = getMetricsField(metrics);
    expect(field).toBe('one more field');
  });

  it('should return undefined when last metric has no field', () => {
    const metrics = [
      { id: 'some-id', type: 'avg', field: 'some field' },
      { id: 'another-id', type: 'count' },
    ] as Metric[];

    const field = getMetricsField(metrics);
    expect(field).toBeUndefined();
  });

  it('should return field of basic aggregation', () => {
    const metrics = [
      { id: 'some-id', type: 'avg', field: 'some field' },
      { id: 'another-id', type: 'sum_bucket', field: 'some-id' },
    ] as Metric[];

    const field = getMetricsField(metrics);
    expect(field).toBe('some field');
  });

  it('should return undefined when basic aggregation has no field', () => {
    const metrics = [
      { id: 'some-id', type: 'filter_ratio' },
      { id: 'another-id', type: 'max_bucket', field: 'some-id' },
    ] as Metric[];

    const field = getMetricsField(metrics);
    expect(field).toBeUndefined();
  });
});
