/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { Dimension, MetricField, MetricUnit } from '../types';
import { useMetricFieldsCapsContext } from '../context/metric_fields_caps_provider';
import { normalizeUnit } from '../common/utils/metric_unit/normalize_unit';
import type { FieldSpec } from '../types';
import { hasValue } from '../common/utils/fields';
import { useMetricsExperienceState } from '../context/metrics_experience_state_provider';
import { useMetricFieldsFilter } from './use_metric_fields_filter';

/**
 * Builds MetricField[] from the context's metric fieldSpecs and sampleRowByMetric.
 * Returns:
 * - metricFields: Complete set of metric fields (for dimension selector, filtering source)
 * - visibleFields: Currently visible fields based on filters (for grid, value selector)
 */
export const useMetricFields = ({
  fetchParams,
}: {
  fetchParams: ChartSectionProps['fetchParams'];
}) => {
  const { searchTerm, selectedDimensions, selectedValueMetricFieldIds, onDimensionsChange } =
    useMetricsExperienceState();
  const { fieldSpecs, sampleRowByMetric } = useMetricFieldsCapsContext();

  const { onPageReady } = usePerformanceContext();

  const metricFields = useMemo(() => {
    if (fieldSpecs.length === 0 || sampleRowByMetric.size === 0) {
      return [];
    }

    const sorted = [...fieldSpecs].sort(
      (a, b) => a.fieldName.localeCompare(b.fieldName) || a.index.localeCompare(b.index)
    );

    const result: MetricField[] = [];
    for (const spec of sorted) {
      const row = sampleRowByMetric.get(spec.key);
      if (row) {
        result.push(buildMetricField(spec, row));
      }
    }

    return result;
  }, [fieldSpecs, sampleRowByMetric]);

  const { filteredFields: visibleFields } = useMetricFieldsFilter({
    fields: metricFields,
    searchTerm,
    dimensions: selectedDimensions,
    dimensionMetricFields: selectedValueMetricFieldIds,
  });

  const dimensions = useMemo(() => getUniqueDimensions(metricFields), [metricFields]);

  const lastValueRef = useRef<{
    metricFields: MetricField[];
    visibleFields: MetricField[];
    dimensions: Dimension[];
  }>({
    metricFields,
    visibleFields,
    dimensions,
  });

  lastValueRef.current = { metricFields, visibleFields, dimensions };

  // Sync selected dimensions when available dimensions change
  useEffect(() => {
    const currentDimensions = lastValueRef.current.dimensions;
    if (currentDimensions.length === 0) {
      return;
    }

    const availableDimNames = new Set(currentDimensions.map((d) => d.name));
    const validSelection = selectedDimensions.filter((d) => availableDimNames.has(d.name));

    if (validSelection.length !== selectedDimensions.length) {
      onDimensionsChange(validSelection);
    }
  }, [selectedDimensions, onDimensionsChange, dimensions]);

  useEffect(() => {
    onPageReady({
      meta: {
        rangeFrom: fetchParams.timeRange?.from,
        rangeTo: fetchParams.timeRange?.to,
      },
      customMetrics: {
        key1: 'metric_experience_fields_loaded',
        value1: fieldSpecs.length,
        key2: 'metrics_experience_poc_version',
        value2: 1,
      },
    });
  }, [fieldSpecs.length, onPageReady, fetchParams.timeRange?.from, fetchParams.timeRange?.to]);

  return {
    metricFields: lastValueRef.current.metricFields,
    visibleFields: lastValueRef.current.visibleFields,
    dimensions: lastValueRef.current.dimensions,
  };
};

const getDimensionsFromRow = (row: DatatableRow, dimensions: Dimension[]): Dimension[] => {
  if (dimensions.length === 0) {
    return dimensions;
  }

  const result: Dimension[] = [];
  for (const dim of dimensions) {
    if (hasValue(row[dim.name])) {
      result.push(dim);
    }
  }
  return result;
};

const getUnit = (row: DatatableRow, fieldName: string): MetricUnit | undefined => {
  if (row.unit && typeof row.unit === 'string') {
    return normalizeUnit({ fieldName, unit: row.unit });
  }

  return undefined;
};

// utility functions

const buildMetricField = (spec: FieldSpec, row: DatatableRow): MetricField => {
  return {
    name: spec.fieldName,
    index: spec.index,
    dimensions: getDimensionsFromRow(row, spec.dimensions),
    type: spec.fieldType,
    instrument: spec.typeInfo.timeSeriesMetric,
    unit: getUnit(row, spec.fieldName),
    display: undefined,
    noData: false,
  };
};

const getUniqueDimensions = (fields: Array<{ dimensions: Dimension[] }>): Dimension[] => {
  const dimensionMap = new Map<string, Dimension>();

  for (const field of fields) {
    for (const dimension of field.dimensions) {
      if (!dimensionMap.has(dimension.name)) {
        dimensionMap.set(dimension.name, dimension);
      }
    }
  }

  return [...dimensionMap.values()].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
};
