/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import { normaliseToStringArray } from './normalise_to_string_array';

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
function rowToNormalisedRow(
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
 * Parses the METRICS_INFO ES|QL response into an array of normalised items.
 * Columns expected: metric_name, data_stream, unit, metric_type, field_type, dimension_fields.
 * Expands one output item per data stream when a row has multiple data streams.
 */
export function parseMetricsInfoResponse(response: ESQLSearchResponse): ParsedMetricsInfoItem[] {
  const columns = response.columns;
  const values = response.values;

  if (columns.length === 0 || values.length === 0) {
    return [];
  }

  const columnIndex = getColumnIndex(columns);
  const result: ParsedMetricsInfoItem[] = [];

  for (const row of values) {
    const normalised = rowToNormalisedRow(columnIndex, row);
    const dataStreams = normalised.dataStreams ?? [];
    const streams = dataStreams.length > 0 ? dataStreams : [''];
    for (const stream of streams) {
      result.push({
        metricName: normalised.metricName,
        dataStreams: [stream],
        units: normalised.units,
        metricTypes: normalised.metricTypes,
        fieldTypes: normalised.fieldTypes,
        dimensions: normalised.dimensions,
      });
    }
  }

  return result;
}
