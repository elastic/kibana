/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';

export interface CloneDataViewAndUseEsqlColumnsAsFieldsDeps {
  fieldFormats: FieldFormatsStartCommon;
}

/**
 * Clones a DataView and uses ES|QL query columns as its fields.
 * This is a plugin-level utility that works with DataView instances.
 *
 * The cloned DataView contains ONLY the fields from the ES|QL response, replacing all
 * fields from the original DataView. ES|QL columns may include:
 * - Computed fields that don't exist in the original index pattern
 * - Type overrides for existing fields (e.g., treating a number field as a keyword)
 * - Subset of fields from the original index (only columns in the ES|QL query)
 *
 * This utility reuses configuration from the base DataView:
 * - metaFields: Taken directly from the base DataView (e.g., _source, _id)
 * - shortDotsEnable: Taken directly from the base DataView
 *
 * @param baseDataView - The original DataView to clone
 * @param esqlQueryColumns - The columns returned from the ES|QL query response
 * @param deps - Dependencies: fieldFormats
 * @returns A new DataView instance with fields derived from esqlQueryColumns
 *
 * @example
 * ```typescript
 * const baseDataView = await dataViews.get('my-index-pattern');
 * const esqlQueryColumns: DatatableColumn[] = [
 *   { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
 *   { id: 'computed', name: 'computed', meta: { type: 'number' }, isComputedColumn: true }
 * ];
 *
 * const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(
 *   baseDataView,
 *   esqlQueryColumns,
 *   { fieldFormats: fieldFormatsService }
 * );
 * // clonedDataView.fields now contains only 'message' and 'computed'
 * ```
 */
export function cloneDataViewAndUseEsqlColumnsAsFields(
  baseDataView: DataView,
  esqlQueryColumns: DatatableColumn[],
  deps: CloneDataViewAndUseEsqlColumnsAsFieldsDeps
): DataView {
  // Convert ES|QL columns to FieldSpec objects
  const fields: Record<string, FieldSpec> = {};
  for (const column of esqlQueryColumns) {
    const fieldSpec = convertDatatableColumnToDataViewFieldSpec(column);
    fields[column.name] = fieldSpec;
  }

  // Clone the base DataView spec and replace fields with ES|QL columns
  const baseSpec = baseDataView.toSpec(false);
  const enrichedSpec = {
    ...baseSpec,
    fields,
  };

  // Create new DataView with enriched spec
  return new DataView({
    spec: enrichedSpec,
    fieldFormats: deps.fieldFormats,
    shortDotsEnable: baseDataView.shortDotsEnable,
    metaFields: baseDataView.metaFields,
  });
}
