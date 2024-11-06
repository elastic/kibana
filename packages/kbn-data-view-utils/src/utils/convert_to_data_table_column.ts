/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';

/**
 * Convert a DataViewField to a DatatableColumn
 */
export function convertDataViewFieldToDatatableColumn(field: FieldSpec): DatatableColumn {
  const isCounterTimeSeries = field.timeSeriesMetric === 'counter';
  const esType =
    isCounterTimeSeries && field.esTypes?.[0] ? `counter_${field.esTypes[0]}` : field.esTypes?.[0];

  return {
    id: field.name,
    name: field.name,
    meta: {
      type: field.type,
      esType,
    },
    isNull: Boolean(field?.isNull),
  } as DatatableColumn;
}
