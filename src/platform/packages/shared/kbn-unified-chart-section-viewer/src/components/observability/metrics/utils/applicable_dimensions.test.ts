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
import { getMetricUniqueKey } from '../../../../common/utils';
import {
  EMPTY_APPLICABLE_DIMENSIONS,
  stabilizeApplicableDimensionsPerItem,
} from './applicable_dimensions';

const createMetricItem = (
  metricName: string,
  dimensionNames: string[]
): ParsedMetricItem => ({
  metricName,
  indexName: 'metrics-test',
  units: ['ms'],
  metricTypes: ['counter'],
  fieldTypes: [ES_FIELD_TYPES.LONG],
  dimensionFields: dimensionNames.map((name) => ({ name })),
});

describe('stabilizeApplicableDimensionsPerItem', () => {
  const hostMetric = createMetricItem('system.cpu.utilization', ['host.name']);
  const containerMetric = createMetricItem('k8s.container.cpu', ['container.id']);

  it('returns only dimension fields included in the selected breakdown set', () => {
    const cache = new Map<string, ReturnType<typeof stabilizeApplicableDimensionsPerItem>[number]>();
    const result = stabilizeApplicableDimensionsPerItem(
      [hostMetric, containerMetric],
      new Set(['host.name', 'service.name']),
      cache
    );

    expect(result[0]).toEqual([{ name: 'host.name' }]);
    expect(result[1]).toBe(EMPTY_APPLICABLE_DIMENSIONS);
  });

  it('reuses EMPTY_APPLICABLE_DIMENSIONS when a metric stays at no applicable breakdown', () => {
    const cache = new Map<string, ReturnType<typeof stabilizeApplicableDimensionsPerItem>[number]>();
    const emptySelection = new Set<string>();

    const firstResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric, containerMetric],
      emptySelection,
      cache
    );
    const secondResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric, containerMetric],
      new Set(['host.name']),
      cache
    );

    expect(firstResult[1]).toBe(EMPTY_APPLICABLE_DIMENSIONS);
    expect(secondResult[1]).toBe(firstResult[1]);
  });

  it('reuses the previous non-empty reference when dimension names are unchanged', () => {
    const cache = new Map<string, ReturnType<typeof stabilizeApplicableDimensionsPerItem>[number]>();
    const hostSelection = new Set(['host.name']);

    const firstResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric, containerMetric],
      hostSelection,
      cache
    );
    const secondResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric, containerMetric],
      new Set(['host.name']),
      cache
    );

    expect(secondResult[0]).toBe(firstResult[0]);
  });

  it('returns a new reference when applicable dimension names change', () => {
    const cache = new Map<string, ReturnType<typeof stabilizeApplicableDimensionsPerItem>[number]>();

    const firstResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric],
      new Set<string>(),
      cache
    );
    const secondResult = stabilizeApplicableDimensionsPerItem(
      [hostMetric],
      new Set(['host.name']),
      cache
    );

    expect(firstResult[0]).toBe(EMPTY_APPLICABLE_DIMENSIONS);
    expect(secondResult[0]).toEqual([{ name: 'host.name' }]);
    expect(secondResult[0]).not.toBe(firstResult[0]);
  });

  it('prunes cache entries for metrics no longer on the page', () => {
    const cache = new Map<string, ReturnType<typeof stabilizeApplicableDimensionsPerItem>[number]>();
    stabilizeApplicableDimensionsPerItem([hostMetric, containerMetric], new Set(['host.name']), cache);

    expect(cache.size).toBe(2);

    stabilizeApplicableDimensionsPerItem([hostMetric], new Set(['host.name']), cache);

    expect(cache.size).toBe(1);
    expect(cache.has(getMetricUniqueKey(hostMetric))).toBe(true);
  });
});
