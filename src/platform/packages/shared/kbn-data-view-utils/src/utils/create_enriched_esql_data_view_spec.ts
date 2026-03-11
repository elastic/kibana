/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldSpec, DataViewSpec } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from './convert_to_data_view_field_spec';

/**
 * Creates an enriched DataViewSpec with fields derived from ES|QL query columns.
 * This is a package-level utility that works with specs (types) only.
 *
 * @param baseSpec - The base DataViewSpec to enrich
 * @param esqlQueryColumns - The columns returned from the ES|QL query response
 * @returns A new DataViewSpec with fields derived from esqlQueryColumns
 */
export function createEnrichedEsqlDataViewSpec(
  baseSpec: DataViewSpec,
  esqlQueryColumns: DatatableColumn[]
): DataViewSpec {
  const fields: Record<string, FieldSpec> = {};
  for (const column of esqlQueryColumns) {
    const fieldSpec = convertDatatableColumnToDataViewFieldSpec(column);
    fields[column.name] = fieldSpec;
  }

  return {
    ...baseSpec,
    fields,
  };
}
