/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { Dimension, MetricField, MetricUnit } from '../types';
import { useMetricFieldsCapsContext } from '../context/metric_fields_caps_provider';
import { normalizeUnit } from '../common/utils/metric_unit/normalize_unit';
import type { FieldSpec } from '../types';
import { hasValue } from '../common/utils/fields';

/**
 * Builds MetricField[] from the context's metric fieldSpecs and sampleRowByMetric.
 * Only includes metrics that have data in the table.
 */
export const useMetricFields = () => {
  const { fieldSpecs, sampleRowByMetric, isFetching } = useMetricFieldsCapsContext();

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

  const lastValueRef = useRef<{ metricFields: MetricField[] }>({ metricFields });

  if (!isFetching) {
    lastValueRef.current = { metricFields };
  }

  return {
    metricFields: lastValueRef.current.metricFields,
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

const getUnit = (
  meta: FieldCapsFieldCapability['meta'],
  row: DatatableRow,
  fieldName: string
): MetricUnit | undefined => {
  const metaUnit = Array.isArray(meta?.unit) ? meta.unit[0] : meta?.unit;

  if (metaUnit) {
    return normalizeUnit({ fieldName, unit: metaUnit });
  }

  if (row.unit && typeof row.unit === 'string') {
    return normalizeUnit({ fieldName, unit: row.unit });
  }

  return undefined;
};

const buildMetricField = (spec: FieldSpec, row: DatatableRow): MetricField => {
  const meta = spec.typeInfo.meta ?? {};
  const display = Array.isArray(meta.display) ? meta.display[0] : meta.display;

  return {
    name: spec.fieldName,
    index: spec.index,
    dimensions: getDimensionsFromRow(row, spec.dimensions),
    type: spec.fieldType,
    instrument: spec.typeInfo.time_series_metric,
    unit: getUnit(meta, row, spec.fieldName),
    display,
    noData: false,
  };
};
