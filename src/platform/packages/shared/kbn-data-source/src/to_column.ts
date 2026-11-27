/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewFieldBase } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Column } from './types';

const COUNTER_PREFIX = 'counter_';

/** An Elasticsearch type without the prefix of an ES|QL time series counter: `counter_long` becomes `long`. */
export const stripCounterPrefix = (esType: string): string =>
  esType.startsWith(COUNTER_PREFIX) ? esType.slice(COUNTER_PREFIX.length) : esType;

/** The Elasticsearch types of a column: its single type, without the prefix of a time series counter. */
export const getColumnEsTypes = (esType: string | undefined): string[] | undefined =>
  esType ? [stripCounterPrefix(esType)] : undefined;

/** A column as a field; ES|QL counter types (`counter_long`, …) become their base type plus `timeSeriesMetric`. */
export function columnToFieldBase(
  column: Column
): DataViewFieldBase & { timeSeriesMetric?: 'counter' } {
  const isCounter = column.esType?.startsWith(COUNTER_PREFIX) ?? false;
  return {
    name: column.name,
    type: column.type,
    esTypes: getColumnEsTypes(column.esType),
    ...(isCounter ? { timeSeriesMetric: 'counter' as const } : {}),
  };
}

/**
 * Source-specific properties (`searchable`, `aggregatable`, runtime field metadata) are
 * intentionally dropped — consumers that need them should narrow to `DataViewSource.getDataView()`.
 */
export function columnFromDataViewField(field: DataViewFieldBase): Column {
  return {
    name: field.name,
    type: field.type as KBN_FIELD_TYPES,
    esType: field.esTypes?.[0],
    source: 'index',
  };
}

/** A computed column (e.g. from `STATS`, `EVAL`) gets `source: 'esql-result'`; an index field gets `source: 'index'`. */
export function columnFromDatatableColumn(column: DatatableColumn): Column {
  return {
    name: column.name,
    type: column.meta.type as KBN_FIELD_TYPES,
    esType: column.meta.esType,
    source: column.isComputedColumn ? 'esql-result' : 'index',
  };
}
