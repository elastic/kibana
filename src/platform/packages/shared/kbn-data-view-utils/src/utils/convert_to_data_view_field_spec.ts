/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { FieldSpec } from '@kbn/data-views-plugin/common';

/**
 * Convert a datatable column to a DataViewFieldSpec
 *
 * @param column - The datatable column from ES|QL response
 * @returns A FieldSpec that can be used to create a DataView field
 *
 * Note: `isComputedColumn` is explicitly set by the ES|QL backend in the response.
 * We default to `false` when the property is absent because:
 * 1. The backend always sends this flag for ES|QL columns since 8.15+
 * 2. Missing flag indicates an index field (not computed)
 * 3. This behavior is consistent with how the backend marks computed fields
 */
export function convertDatatableColumnToDataViewFieldSpec(column: DatatableColumn): FieldSpec {
  let esType = column.meta?.esType;
  let timeSeriesMetric: MappingTimeSeriesMetricType | undefined;

  // 'counter_integer', 'counter_long', 'counter_double'...
  if (esType?.startsWith('counter_')) {
    esType = esType?.replace('counter_', '');
    timeSeriesMetric = 'counter';
  }

  // `DataViewField` class is defined in "data-views" plugin, so we can't create an instance of it from a package.
  // We will return a data view field spec here instead then.
  return {
    name: column.name,
    type: column.meta?.type ?? 'unknown',
    esTypes: esType ? [esType] : undefined,
    searchable: true,
    aggregatable: false,
    isNull: Boolean(column?.isNull),
    isComputedColumn: Boolean(column?.isComputedColumn),
    ...(timeSeriesMetric ? { timeSeriesMetric } : {}),
  };
}

/**
 * Convert an array of datatable columns to a record of DataViewFieldSpecs
 *
 * @param columns - The datatable columns from ES|QL response
 * @returns A record of FieldSpecs keyed by field name, ready to use with DataView.cloneWithFields()
 *
 * @example
 * ```typescript
 * const esqlColumns: DatatableColumn[] = [...];
 * const fields = convertDatatableColumnsToFieldSpecs(esqlColumns);
 * const enrichedDataView = baseDataView.cloneWithFields(fields);
 * ```
 */
export function convertDatatableColumnsToFieldSpecs(
  columns: DatatableColumn[]
): Record<string, FieldSpec> {
  const fields: Record<string, FieldSpec> = {};
  for (const column of columns) {
    fields[column.name] = convertDatatableColumnToDataViewFieldSpec(column);
  }
  return fields;
}
