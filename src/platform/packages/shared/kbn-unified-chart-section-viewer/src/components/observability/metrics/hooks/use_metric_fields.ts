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
import type { Dimension, MetricField, MetricUnit } from '../../../../types';
import { useMetricsExperienceFieldsContext } from '../context/metrics_experience_fields_provider';
import { normalizeUnit } from '../../../../common/utils/metric_unit/normalize_unit';
import { hasValue } from '../../../../common/utils/fields';
import { useMetricsExperienceState } from '../context/metrics_experience_state_provider';
import { useMetricFieldsFilter } from './use_metric_fields_filter';

interface UseMetricFieldsReturn {
  allMetricFields: MetricField[];
  visibleMetricFields: MetricField[];
  dimensions: Dimension[];
}

/**
 * Builds MetricField[] from the context's metric fieldSpecs and sampleRowByMetric.
 * Returns:
 * - allMetricFields: Complete set of metric fields (for dimension selector, filtering source)
 * - visibleMetricFields: Currently visible fields based on filters
 * - dimensions: Unique dimensions extracted from sampled metric fields
 */
export const useMetricFields = (): UseMetricFieldsReturn => {
  const { searchTerm, selectedDimensions, onDimensionsChange } = useMetricsExperienceState();
  const { metricFields, dimensions, getSampleRow } = useMetricsExperienceFieldsContext();

  // Ref to access current values in effects without adding them to dependencies
  const stateRef = useRef({
    selectedDimensions: [] as Dimension[],
    returnValue: null as UseMetricFieldsReturn | null,
  });

  stateRef.current.selectedDimensions = selectedDimensions;

  const enrichedMetricFields = useMemo(() => {
    if (metricFields.length === 0) {
      return [];
    }

    const fields: MetricField[] = [];

    for (const metricField of metricFields) {
      // Filter out legacy histogram metric types
      if (metricField.type === 'histogram') {
        continue;
      }

      const row = getSampleRow(metricField.name);
      if (row) {
        const enriched = enrichMetricField(metricField, dimensions, row);
        fields.push(enriched);
      }
    }

    return fields;
  }, [metricFields, dimensions, getSampleRow]);

  const { filteredFields: visibleMetricFields } = useMetricFieldsFilter({
    fields: enrichedMetricFields,
    searchTerm,
    dimensions: selectedDimensions,
  });

  // Update return value
  stateRef.current.returnValue = {
    allMetricFields: enrichedMetricFields,
    visibleMetricFields,
    dimensions,
  };

  // Sync selected dimensions when context data changes - removes invalid selections
  useEffect(() => {
    const currentSelection = stateRef.current.selectedDimensions;
    if (dimensions.length === 0 || currentSelection.length === 0) {
      return;
    }

    const availableDimNames = new Set(dimensions.map((d) => d.name));
    const validSelection = currentSelection.filter((d) => availableDimNames.has(d.name));

    if (validSelection.length !== currentSelection.length) {
      onDimensionsChange(validSelection);
    }
  }, [onDimensionsChange, dimensions]);

  return stateRef.current.returnValue;
};

// utility functions
const getDimensionsFromRow = (row: DatatableRow, dimensions: Dimension[]): Dimension[] => {
  if (dimensions.length === 0) {
    return dimensions;
  }

  const result: Dimension[] = [];
  for (const dim of dimensions) {
    if (dim.name !== 'unit' && hasValue(row[dim.name])) {
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

const enrichMetricField = (
  metricField: MetricField,
  dimensions: Dimension[],
  row: DatatableRow
): MetricField => {
  return {
    ...metricField,
    dimensions: getDimensionsFromRow(row, dimensions),
    unit: getUnit(row, metricField.name),
  };
};
