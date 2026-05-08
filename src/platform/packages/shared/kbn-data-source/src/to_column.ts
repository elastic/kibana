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

/**
 * Adapts a {@link DataViewFieldBase} (from a `DataView`) to the unified
 * {@link Column} shape consumed by `DataSource`.
 *
 * Used by `IndexPatternSource`. Source-specific properties (e.g. `searchable`,
 * `aggregatable`, runtime field metadata) are intentionally dropped — consumers
 * that need them should narrow to `IndexPatternSource` and call `getDataView()`.
 */
export function columnFromDataViewField(field: DataViewFieldBase): Column {
  return {
    name: field.name,
    type: field.type as KBN_FIELD_TYPES,
    esType: field.esTypes?.[0],
    source: 'index',
  };
}

/**
 * Adapts an ES|QL result {@link DatatableColumn} to the unified {@link Column}
 * shape consumed by `DataSource`.
 *
 * Used by `EsqlSource`. The column may be computed (e.g. produced by `STATS`,
 * `EVAL`) and not exist in the underlying index — see {@link Column.source}.
 */
export function columnFromDatatableColumn(column: DatatableColumn): Column {
  return {
    name: column.name,
    type: column.meta.type as KBN_FIELD_TYPES,
    esType: column.meta.esType,
    source: 'esql-result',
  };
}
