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
 * @param baseSpec - The base DataView spec to enrich
 * @param columns - The columns returned from the ES|QL query response
 * @returns An enriched DataViewSpec with fields from the columns
 */
export function enrichDataViewSpecWithEsqlColumns(
  baseSpec: DataViewSpec,
  columns: DatatableColumn[]
): DataViewSpec {
  return {
    ...baseSpec,
    fields: createFieldsFromEsqlColumns(columns),
  };
}
