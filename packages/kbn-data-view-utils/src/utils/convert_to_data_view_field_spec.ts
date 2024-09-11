/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldSpec } from '@kbn/data-views-plugin/common';

/**
 * Convert a datatable column to a DataViewFieldSpec
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
    ...(timeSeriesMetric ? { timeSeriesMetric } : {}),
  };
}
