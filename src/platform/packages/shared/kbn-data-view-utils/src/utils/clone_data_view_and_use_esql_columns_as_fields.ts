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
 * This is a package-level utility that works with DataViewSpec (not DataView instances).
 *
 * The enriched spec contains ONLY the fields from the ES|QL response, replacing all
 * fields from the original spec. ES|QL columns may include:
 * - Computed fields that don't exist in the original index pattern
 * - Type overrides for existing fields (e.g., treating a number field as a keyword)
 * - Subset of fields from the original index (only columns in the ES|QL query)
 *
 * @param baseSpec - The original DataViewSpec to enrich
 * @param esqlQueryColumns - The columns returned from the ES|QL query response
 * @returns An enriched DataViewSpec with fields derived from esqlQueryColumns
 *
 * @example
 * ```typescript
 * const baseSpec = baseDataView.toSpec(false);
 * const esqlQueryColumns: DatatableColumn[] = [
 *   { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
 *   { id: 'computed', name: 'computed', meta: { type: 'number' }, isComputedColumn: true }
 * ];
 *
 * const enrichedSpec = createEnrichedEsqlDataViewSpec(baseSpec, esqlQueryColumns);
 * // enrichedSpec.fields now contains only 'message' and 'computed'
 *
 * // Construct a DataView from the spec:
 * const enrichedDataView = new DataView({
 *   spec: enrichedSpec,
 *   fieldFormats,
 *   shortDotsEnable: baseDataView.shortDotsEnable,
 *   metaFields: baseDataView.metaFields,
 * });
 * ```
 */
export function createEnrichedEsqlDataViewSpec(
  baseSpec: DataViewSpec,
  esqlQueryColumns: DatatableColumn[]
): DataViewSpec {
  // Convert ES|QL columns to FieldSpec objects
  const fields: Record<string, FieldSpec> = {};
  for (const column of esqlQueryColumns) {
    const fieldSpec = convertDatatableColumnToDataViewFieldSpec(column);
    fields[column.name] = fieldSpec;
  }

  // Clone the base spec and replace fields with ES|QL columns
  return {
    ...baseSpec,
    fields,
  };
}
