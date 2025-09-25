/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMetricField } from './build_metric_field';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { Dimension } from '../../../common/types';

describe('buildMetricField', () => {
  it('should build a metric field with string meta properties for a gauge', () => {
    const name = 'test.metric';
    const index = 'test-index';
    const dimensions: Dimension[] = [{ name: 'host.name', type: 'keyword' }];
    const type = 'double';
    const typeInfo: FieldCapsFieldCapability = {
      aggregatable: true,
      searchable: true,
      type: 'double',
      time_series_metric: 'gauge',
      meta: {
        unit: 'bytes',
        display: 'Test Metric',
      },
    };

    const result = buildMetricField({ name, index, dimensions, type, typeInfo });

    expect(result).toEqual({
      name,
      index,
      dimensions,
      type,
      instrument: 'gauge',
      unit: 'bytes',
      display: 'Test Metric',
    });
  });

  it('should build a metric field with array meta properties for a counter', () => {
    const name = 'test.metric.array';
    const index = 'test-index';
    const dimensions: Dimension[] = [];
    const type = 'long';
    const typeInfo: FieldCapsFieldCapability = {
      aggregatable: true,
      searchable: true,
      type: 'long',
      time_series_metric: 'counter',
      meta: {
        unit: ['bytes', 'per_second'],
        display: ['Another', 'Display'],
      },
    };

    const result = buildMetricField({ name, index, dimensions, type, typeInfo });

    expect(result).toEqual({
      name,
      index,
      dimensions,
      type,
      instrument: 'counter',
      unit: 'bytes, per_second',
      display: 'Another, Display',
    });
  });

  it('should handle missing meta properties for a gauge', () => {
    const name = 'test.metric.no_meta';
    const index = 'test-index';
    const dimensions: Dimension[] = [];
    const type = 'double';
    const typeInfo: FieldCapsFieldCapability = {
      aggregatable: true,
      searchable: true,
      type: 'double',
      time_series_metric: 'gauge',
      meta: {},
    };

    const result = buildMetricField({ name, index, dimensions, type, typeInfo });

    expect(result).toEqual({
      name,
      index,
      dimensions,
      type,
      instrument: 'gauge',
      unit: undefined,
      description: undefined,
      display: undefined,
    });
  });

  it('should handle completely missing meta object for a gauge', () => {
    const name = 'test.metric.no_meta_object';
    const index = 'test-index';
    const dimensions: Dimension[] = [];
    const type = 'double';
    const typeInfo: FieldCapsFieldCapability = {
      aggregatable: true,
      searchable: true,
      type: 'double',
      time_series_metric: 'gauge',
    };

    const result = buildMetricField({ name, index, dimensions, type, typeInfo });

    expect(result).toEqual({
      name,
      index,
      dimensions,
      type,
      instrument: 'gauge',
      unit: undefined,
      display: undefined,
    });
  });
});
