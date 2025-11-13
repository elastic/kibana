/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useFilteredMetricFields } from './use_filtered_metric_fields';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { useMetricFieldsSearchQuery } from './use_metric_fields_search_query';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

jest.mock('./use_metric_fields_search_query', () => ({
  useMetricFieldsSearchQuery: jest.fn(() => ({
    data: [],
    isFetching: false,
  })),
}));

const mockUseMetricFieldsSearchQuery = useMetricFieldsSearchQuery as jest.MockedFunction<
  typeof useMetricFieldsSearchQuery
>;

const createField = (name: string, dimensions: string[] = []): MetricField => ({
  name,
  type: 'number',
  dimensions: dimensions.map((d) => ({ name: d, type: ES_FIELD_TYPES.KEYWORD })),
  index: 'metrics-*',
});

const DEFAULT_TIME_RANGE = { from: 'now-15m', to: 'now' };

const createValueFilter = (field: string, value: string) =>
  `${field}${FIELD_VALUE_SEPARATOR}${value}`;

describe('useFilteredMetricFields', () => {
  const renderFilteredFields = (
    overrides: Partial<Parameters<typeof useFilteredMetricFields>[0]> = {}
  ) => {
    const defaults = {
      allFields: [],
      searchTerm: '',
      dimensions: [],
      valueFilters: [],
      timeRange: undefined,
      onFilterComplete: jest.fn(),
    };
    return renderHook(() => useFilteredMetricFields({ ...defaults, ...overrides }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetricFieldsSearchQuery.mockReturnValue({
      data: [],
      isFetching: false,
      status: 'success',
    });
  });

  it('returns all fields when no filters applied', () => {
    const allFields = [
      createField('field1'),
      createField('field2'),
      createField('field3'),
      createField('field4'),
    ];

    const { result } = renderFilteredFields({ allFields });

    expect(result.current.fields.map((f) => f.name)).toEqual([
      'field1',
      'field2',
      'field3',
      'field4',
    ]);
    expect(result.current.filters).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('filters fields by search term', () => {
    const allFields = [
      createField('field1'),
      createField('field2'),
      createField('field3'),
      createField('field4'),
      createField('field44'),
    ];

    const { result } = renderFilteredFields({ allFields, searchTerm: '4' });

    expect(result.current.fields.map((f) => f.name)).toEqual(['field4', 'field44']);
  });

  it('filters fields based on dimensions', () => {
    const allFields = [
      createField('field1', ['foo']),
      createField('field2', ['bar']),
      createField('field3', ['foo', 'bar']),
      createField('field4', []),
    ];

    const { result } = renderFilteredFields({ allFields, dimensions: ['foo'] });

    expect(result.current.fields.map((f) => f.name)).toEqual(['field1', 'field3']);
  });

  it('combines search term and dimension filters', () => {
    const allFields = [
      createField('metric1', ['foo']),
      createField('metric2', ['bar']),
      createField('metric3', ['foo']),
      createField('field1', ['foo']),
    ];

    const { result } = renderFilteredFields({
      allFields,
      searchTerm: 'metric',
      dimensions: ['foo'],
    });

    expect(result.current.fields.map((f) => f.name)).toEqual(['metric1', 'metric3']);
  });

  describe('value filter', () => {
    const metricFields = [createField('field1'), createField('field2')];

    it('does not call search query when no value filters provided', () => {
      renderFilteredFields({ allFields: metricFields, timeRange: DEFAULT_TIME_RANGE });

      expect(mockUseMetricFieldsSearchQuery).toHaveBeenCalledWith({
        fields: [],
        index: '',
        timeRange: DEFAULT_TIME_RANGE,
        kuery: undefined,
        enabled: false,
      });
    });

    it('calls search query when value filters are provided', () => {
      renderFilteredFields({
        allFields: metricFields,
        valueFilters: [createValueFilter('host.name', 'server1')],
        timeRange: DEFAULT_TIME_RANGE,
      });

      expect(mockUseMetricFieldsSearchQuery).toHaveBeenCalledWith({
        fields: ['field1', 'field2'],
        index: 'metrics-*',
        timeRange: DEFAULT_TIME_RANGE,
        kuery: 'host.name:"server1"',
        enabled: true,
      });
    });

    it('calls search query with correct field names after filtering', () => {
      const allFields = [
        createField('metric1', ['foo']),
        createField('metric2', ['bar']),
        createField('field1', ['foo']),
      ];

      renderFilteredFields({
        allFields,
        searchTerm: 'metric',
        valueFilters: [createValueFilter('host.name', 'server1')],
        timeRange: DEFAULT_TIME_RANGE,
      });

      // Should only include fields that pass client-side filtering
      expect(mockUseMetricFieldsSearchQuery).toHaveBeenCalledWith({
        fields: ['metric1', 'metric2'],
        index: 'metrics-*',
        timeRange: DEFAULT_TIME_RANGE,
        kuery: 'host.name:"server1"',
        enabled: true,
      });
    });

    it('does not call search when all fields are filtered out by client-side filtering', () => {
      renderFilteredFields({
        allFields: metricFields,
        searchTerm: 'nonexistent',
        valueFilters: [createValueFilter('host.name', 'server1')],
        timeRange: DEFAULT_TIME_RANGE,
      });

      expect(mockUseMetricFieldsSearchQuery).toHaveBeenCalledWith({
        fields: [],
        index: '',
        timeRange: DEFAULT_TIME_RANGE,
        kuery: 'host.name:"server1"',
        enabled: false,
      });
    });
  });
});
