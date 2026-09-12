/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../../../types';
import { getDuplicateMetricNames } from './get_duplicate_metric_names';

const buildMetricItem = (
  metricName: string,
  indexName: string = 'metrics-*'
): ParsedMetricItem => ({
  metricName,
  indexName,
  units: [null],
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dimensionFields: [],
});

describe('getDuplicateMetricNames', () => {
  it('returns an empty set for an empty array', () => {
    expect(getDuplicateMetricNames([])).toEqual(new Set());
  });

  it('returns an empty set when all metric names are unique', () => {
    const items = [buildMetricItem('cpu.usage'), buildMetricItem('memory.usage')];
    expect(getDuplicateMetricNames(items)).toEqual(new Set());
  });

  it('returns duplicate metric names when the same name appears more than once', () => {
    const items = [
      buildMetricItem('cpu.usage', 'stream-a'),
      buildMetricItem('memory.usage', 'stream-a'),
      buildMetricItem('cpu.usage', 'stream-b'),
    ];
    expect(getDuplicateMetricNames(items)).toEqual(new Set(['cpu.usage']));
  });

  it('excludes non-duplicate names from the result', () => {
    const items = [
      buildMetricItem('cpu.usage', 'stream-a'),
      buildMetricItem('cpu.usage', 'stream-b'),
      buildMetricItem('memory.usage'),
    ];
    const result = getDuplicateMetricNames(items);
    expect(result.has('cpu.usage')).toBe(true);
    expect(result.has('memory.usage')).toBe(false);
  });

  it('handles multiple different duplicate names', () => {
    const items = [
      buildMetricItem('cpu.usage', 'stream-a'),
      buildMetricItem('cpu.usage', 'stream-b'),
      buildMetricItem('disk.io', 'stream-a'),
      buildMetricItem('disk.io', 'stream-c'),
      buildMetricItem('memory.usage'),
    ];
    expect(getDuplicateMetricNames(items)).toEqual(new Set(['cpu.usage', 'disk.io']));
  });
});
