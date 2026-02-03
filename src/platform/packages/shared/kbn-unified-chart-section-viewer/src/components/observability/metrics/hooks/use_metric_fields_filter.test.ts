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
import { useMetricFieldsFilter } from './use_metric_fields_filter';
import type { MetricField, Dimension } from '../../../../types';

describe('useMetricFieldsFilter', () => {
  const baseDimensions: Dimension[] = [
    { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
  ];

  const baseFields: MetricField[] = [
    {
      name: 'system.cpu.utilization',
      index: 'metrics-*',
      type: ES_FIELD_TYPES.DOUBLE,
      dimensions: [baseDimensions[0], baseDimensions[1]],
    },
    {
      name: 'system.memory.utilization',
      index: 'metrics-*',
      type: ES_FIELD_TYPES.DOUBLE,
      dimensions: [baseDimensions[0]],
    },
    {
      name: 'system.disk.io',
      index: 'metrics-*',
      type: ES_FIELD_TYPES.LONG,
      dimensions: [baseDimensions[1]],
    },
  ];

  const defaultParams = {
    fields: baseFields,
    searchTerm: '',
    dimensions: [] as Dimension[],
  };

  describe('when no filters are applied', () => {
    it('returns all fields', () => {
      const { result } = renderHook(() => useMetricFieldsFilter(defaultParams));

      expect(result.current.filteredFields).toEqual(baseFields);
    });
  });

  describe('search term filtering', () => {
    it('filters fields by search term (case-insensitive)', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          searchTerm: 'cpu',
        })
      );

      expect(result.current.filteredFields).toHaveLength(1);
      expect(result.current.filteredFields[0].name).toBe('system.cpu.utilization');
    });

    it('filters fields by uppercase search term', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          searchTerm: 'CPU',
        })
      );

      expect(result.current.filteredFields).toHaveLength(1);
      expect(result.current.filteredFields[0].name).toBe('system.cpu.utilization');
    });

    it('returns multiple matches for partial search term', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          searchTerm: '.u',
        })
      );

      expect(result.current.filteredFields).toHaveLength(2);
      expect(result.current.filteredFields.map((f) => f.name)).toEqual([
        'system.cpu.utilization',
        'system.memory.utilization',
      ]);
    });

    it('returns empty array when no fields match search term', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          searchTerm: 'nonexistent',
        })
      );

      expect(result.current.filteredFields).toEqual([]);
    });
  });

  describe('dimension filtering', () => {
    it('filters fields by selected dimension', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          dimensions: [{ name: 'service.name', type: ES_FIELD_TYPES.KEYWORD }],
        })
      );

      expect(result.current.filteredFields).toHaveLength(2);
      expect(result.current.filteredFields.map((f) => f.name).sort()).toEqual([
        'system.cpu.utilization',
        'system.disk.io',
      ]);
    });

    it('filters fields by multiple dimensions (OR logic)', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          dimensions: baseDimensions,
        })
      );

      // All fields have at least one of the dimensions
      expect(result.current.filteredFields).toHaveLength(3);
    });

    it('returns empty array when no fields have the selected dimension', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          dimensions: [{ name: 'nonexistent.dimension', type: ES_FIELD_TYPES.KEYWORD }],
        })
      );

      expect(result.current.filteredFields).toEqual([]);
    });
  });

  describe('combined filters', () => {
    it('applies both search term and dimension filters', () => {
      const { result } = renderHook(() =>
        useMetricFieldsFilter({
          ...defaultParams,
          searchTerm: 'cpu',
          dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
        })
      );

      expect(result.current.filteredFields).toHaveLength(1);
      expect(result.current.filteredFields[0].name).toBe('system.cpu.utilization');
    });
  });
});
