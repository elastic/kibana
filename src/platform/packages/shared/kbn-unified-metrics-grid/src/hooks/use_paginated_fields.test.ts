/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePaginatedFields } from './use_paginated_fields';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const createField = (name: string, dimensions: string[] = [], noData = false): MetricField => ({
  name,
  type: 'number',
  dimensions: dimensions.map((d) => ({ name: d, type: ES_FIELD_TYPES.KEYWORD })),
  index: 'metrics-*',
  noData,
});

describe('usePaginatedFields', () => {
  it('returns correct pagination for first page', async () => {
    const fields = [
      createField('field1'),
      createField('field2'),
      createField('field3'),
      createField('field4'),
    ];
    const dimensions: string[] = [];
    const valueMetrics: string[] = [];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        searchTerm: '',
        dimensions,
        valueMetrics,
        pageSize: 2,
        currentPage: 0,
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['field1', 'field2']);
      expect(result.current?.totalPages).toBe(2);
    });
  });

  it('returns correct search results with searchTerm provided', async () => {
    const fields = [
      createField('field1'),
      createField('field2'),
      createField('field3'),
      createField('field4'),
      createField('field44'),
    ];
    const dimensions: string[] = [];
    const valueMetrics: string[] = [];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        searchTerm: '4',
        dimensions,
        valueMetrics,
        pageSize: 2,
        currentPage: 0,
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['field4', 'field44']);
      expect(result.current?.totalPages).toBe(1);
    });
  });

  it('returns correct pagination for second page', async () => {
    const fields = [
      createField('field1'),
      createField('field2'),
      createField('field3'),
      createField('field4'),
    ];
    const dimensions: string[] = [];
    const valueMetrics: string[] = [];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        searchTerm: '',
        dimensions,
        valueMetrics,
        pageSize: 2,
        currentPage: 1,
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['field3', 'field4']);
      expect(result.current?.totalPages).toBe(2);
    });
  });

  it('filters fields based on dimensions', async () => {
    const fields = [
      createField('field1', ['foo']),
      createField('field2', ['bar']),
      createField('field3', ['foo', 'bar']),
      createField('field4', []),
    ];
    const dimensions: string[] = ['foo'];
    const valueMetrics: string[] = [];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        searchTerm: '',
        dimensions,
        valueMetrics,
        pageSize: 10,
        currentPage: 0,
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['field1', 'field3']);
      expect(result.current?.dimensionFilteredMetrics).toEqual([
        { name: 'field1', index: 'metrics-*' },
        { name: 'field3', index: 'metrics-*' },
      ]);
      expect(result.current?.totalPages).toBe(1);
    });
  });

  it('filters fields based on valueMetrics', async () => {
    const fields = [
      createField('metric1', ['foo']),
      createField('metric2', ['bar']),
      createField('metric3', ['foo', 'bar']),
      createField('metric4', ['foo']),
    ];
    const dimensions: string[] = ['foo'];
    const valueMetrics: string[] = ['metric1', 'metric3'];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        searchTerm: '',
        dimensions,
        valueMetrics,
        pageSize: 10,
        currentPage: 0,
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['metric1', 'metric3']);
      expect(result.current?.dimensionFilteredMetrics).toEqual([
        { name: 'metric1', index: 'metrics-*' },
        { name: 'metric3', index: 'metrics-*' },
        { name: 'metric4', index: 'metrics-*' },
      ]);
      expect(result.current?.filteredFieldsCount).toBe(2);
      expect(result.current?.totalPages).toBe(1);
    });
  });

  it('ignores fields with noData', async () => {
    const fields = [createField('field1'), createField('field2', [], true)];
    const dimensions: string[] = [];
    const valueMetrics: string[] = [];

    const { result } = renderHook(() =>
      usePaginatedFields({
        fields,
        dimensions,
        valueMetrics,
        pageSize: 10,
        currentPage: 0,
        searchTerm: '',
      })
    );

    await waitFor(() => {
      expect(result.current?.currentPageFields.map((f) => f.name)).toEqual(['field1']);
      expect(result.current?.totalPages).toBe(1);
    });
  });
});
