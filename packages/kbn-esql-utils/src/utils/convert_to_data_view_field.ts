/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export function convertColumnToDataViewField(column: DatatableColumn): DataViewField {
  let esType = column.meta?.esType;
  let timeSeriesMetric: MappingTimeSeriesMetricType | undefined;

  // 'counter_integer', 'counter_long', 'counter_double'...
  if (esType?.startsWith('counter_')) {
    esType = esType?.replace('counter_', '');
    timeSeriesMetric = 'counter';
  }

  return new DataViewField({
    name: column.name,
    type: column.meta?.type ?? 'unknown',
    esTypes: esType ? [esType] : undefined,
    searchable: true,
    aggregatable: false,
    isNull: Boolean(column?.isNull),
    timeSeriesMetric,
  });
}
