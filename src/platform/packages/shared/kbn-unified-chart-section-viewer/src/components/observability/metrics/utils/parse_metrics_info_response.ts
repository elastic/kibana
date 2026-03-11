/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import type { MetricField } from '@kbn/unified-chart-section-viewer';
import { normaliseToStringArray } from './normalise_to_string_array';

/** Parsed METRICS_INFO result; allDimensionFields is union of all dimension_fields (no duplicates). */
export interface ParsedMetricFields {
  metricFields: MetricField[];
  allDimensionFields: string[];
}

/**
 * One parsed metric item (one per data stream after expansion).
 */
export interface ParsedMetricsInfoItem {
  metricName: string;
  dataStreams: string[] | null;
  units: string[] | null;
  metricTypes: string[] | null;
  fieldTypes: string[] | null;
  dimensions: string[] | null;
}

/** Expected METRICS_INFO column names; used for typed column index lookup. */
const METRICS_INFO_COLUMN_NAMES = [
  'metric_name',
  'data_stream',
  'unit',
  'metric_type',
  'field_type',
  'dimension_fields',
] as const;

type MetricColumnName = (typeof METRICS_INFO_COLUMN_NAMES)[number];

/** Maps each expected column name to its index in the row array, or -1 if missing. */
function getColumnIndex(columns: Array<{ name?: string }>): Record<MetricColumnName, number> {
  const result = {} as Record<MetricColumnName, number>;
  for (const name of METRICS_INFO_COLUMN_NAMES) {
    const idx = columns.findIndex((c) => c.name === name);
    result[name] = idx >= 0 ? idx : -1;
  }
  return result;
}

/** Maps one raw ESQL row to a typed normalised row using column indices. */
function normaliseRows(
  columnIndex: Record<MetricColumnName, number>,
  row: ESQLRow
): ParsedMetricsInfoItem {
  const rawMetricName = row[columnIndex.metric_name];
  return {
    metricName: typeof rawMetricName === 'string' ? rawMetricName : '',
    dataStreams: normaliseToStringArray(row[columnIndex.data_stream]),
    units: normaliseToStringArray(row[columnIndex.unit]),
    metricTypes: normaliseToStringArray(row[columnIndex.metric_type]),
    fieldTypes: normaliseToStringArray(row[columnIndex.field_type]),
    dimensions: normaliseToStringArray(row[columnIndex.dimension_fields]),
  };
}

/**
 * Parses the METRICS_INFO ES|QL response into metric fields and a union of all dimension fields.
 * Columns expected: metric_name, data_stream, unit, metric_type, field_type, dimension_fields.
 * Expands one output item per data stream when a row has multiple data streams.
 * Collects all unique dimension_fields across rows (no duplicates). Dimensions are returned as string[].
 */
export function parseMetricsInfoResponse(response: ESQLSearchResponse): ParsedMetricFields {
  const columns = response.columns;
  const values = response.values;

  if (columns.length === 0 || values.length === 0) {
    return { metricFields: [], allDimensionFields: [] };
  }

  const columnIndex = getColumnIndex(columns);
  const metricFields: MetricField[] = [];
  const allDimensionFields = new Set<string>();

  for (const row of values) {
    const normalised = normaliseRows(columnIndex, row);
    for (const d of normalised.dimensions ?? []) {
      if (typeof d === 'string' && d !== '') {
        allDimensionFields.add(d);
      }
    }

    const dataStreams = normalised.dataStreams ?? [];
    const streams = dataStreams.length > 0 ? dataStreams : [''];
    const dimensions = normalised.dimensions ?? [];
    for (const stream of streams) {
      metricFields.push({
        name: normalised.metricName,
        dataStreams: [stream],
        metricTypes: normalised.metricTypes,
        fieldtypes: normalised.fieldTypes,
        units: normalised.units,
        dimensions,
      });
    }
  }

  return {
    metricFields,
    allDimensionFields: Array.from(allDimensionFields),
  };
}
