/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { Dimension, ParsedMetricItem } from '../../../../types';
import { EMPTY_APPLICABLE_DIMENSIONS } from '../utils/applicable_dimensions';
import { useApplicableDimensionsPerItem } from './use_applicable_dimensions_per_item';

const hostMetric: ParsedMetricItem = {
  metricName: 'system.cpu.utilization',
  indexName: 'metrics-system',
  units: ['ms'],
  metricTypes: ['counter'],
  fieldTypes: [ES_FIELD_TYPES.LONG],
  dimensionFields: [{ name: 'host.name' }],
};

const containerMetric: ParsedMetricItem = {
  metricName: 'k8s.container.cpu',
  indexName: 'metrics-k8s',
  units: ['ms'],
  metricTypes: ['counter'],
  fieldTypes: [ES_FIELD_TYPES.LONG],
  dimensionFields: [{ name: 'container.id' }],
};

describe('useApplicableDimensionsPerItem', () => {
  it('returns the same empty reference when a metric stays without applicable breakdown', () => {
    const metricItems = [hostMetric, containerMetric];
    const { result, rerender } = renderHook(
      ({ dimensions }: { dimensions: Dimension[] }) =>
        useApplicableDimensionsPerItem(metricItems, dimensions),
      { initialProps: { dimensions: [] as Dimension[] } }
    );

    const initialEmptyReference = result.current[1];

    rerender({ dimensions: [{ name: 'host.name' }] });

    expect(result.current[1]).toBe(initialEmptyReference);
    expect(result.current[1]).toBe(EMPTY_APPLICABLE_DIMENSIONS);
  });

  it('returns the same reference when dimensions get a new array with the same names', () => {
    const metricItems = [hostMetric];
    const { result, rerender } = renderHook(
      ({ dimensions }: { dimensions: Dimension[] }) =>
        useApplicableDimensionsPerItem(metricItems, dimensions),
      { initialProps: { dimensions: [{ name: 'host.name' }] } }
    );

    const initialReference = result.current[0];

    rerender({ dimensions: [{ name: 'host.name' }] });

    expect(result.current[0]).toBe(initialReference);
  });
});
