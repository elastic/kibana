/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from './convert_to_data_view_field_spec';

/**
 * Creates fields from ES|QL query columns or DatatableColumns.
 * Returns a map of field names to field specs that can be used to enrich a DataView.
 *
 * @param columns - The columns returned from the ES|QL query response (DatatableColumn[])
 * @returns A map of field names to field specs
 *
 * @example
 * ```typescript
 * const columns: DatatableColumn[] = [
 *   { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
 *   { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' }, isComputedColumn: true }
 * ];
 * const fields = createFieldsFromEsqlColumns(columns);
 * // Returns: { message: { name: 'message', type: 'string', ... }, count: { name: 'count', type: 'number', isComputedColumn: true, ... } }
 * ```
 */
export function createFieldsFromEsqlColumns(columns: DatatableColumn[]): Record<string, FieldSpec> {
  const fields: Record<string, FieldSpec> = {};

  for (const column of columns) {
    const fieldSpec = convertDatatableColumnToDataViewFieldSpec(column);
    fields[column.name] = fieldSpec;
  }

  return fields;
}

/**
 * Enriches a DataViewSpec with fields from ES|QL columns.
 * The caller is responsible for creating the DataView instance from the returned spec.
 *
 * @param dataViewSpec - The source DataView spec to enrich
 * @param columns - The columns returned from the ES|QL query response
 * @returns An enriched DataViewSpec with fields from the columns
 *
 * @example
 * ```typescript
 * const baseSpec = existingDataView.toSpec(false);
 * const columns: DatatableColumn[] = [
 *   { id: 'bytes', name: 'bytes', meta: { type: 'string', esType: 'keyword' }, isComputedColumn: false }
 * ];
 * const enrichedSpec = enrichDataViewSpecWithEsqlColumns(baseSpec, columns);
 * // enrichedSpec.fields now contains the field specs from columns, overriding the original bytes field type
 * ```
 */
export function enrichDataViewSpecWithEsqlColumns(
  dataViewSpec: DataViewSpec,
  columns: DatatableColumn[]
): DataViewSpec {
  return {
    ...dataViewSpec,
    fields: createFieldsFromEsqlColumns(columns),
  };
}
