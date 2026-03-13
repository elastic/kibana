/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnsToFieldSpecs } from './convert_to_data_view_field_spec';

/**
 * Creates a stable signature from ES|QL columns for memoization comparison.
 * The signature includes field name, type, esType, and time field name to detect schema changes.
 */
function getColumnsSignature(columns: DatatableColumn[], timeFieldName?: string): string {
  const colsSignature = columns
    .map((col) => `${col.name}:${col.meta?.type ?? 'unknown'}:${col.meta?.esType ?? ''}`)
    .sort()
    .join('|');
  return timeFieldName ? `${colsSignature}|tf:${timeFieldName}` : colsSignature;
}

export interface EsqlDataViewEnricher {
  /**
   * Returns an enriched DataView with ES|QL column fields.
   * Reuses cached DataView if columns and base DataView haven't changed.
   *
   * @param baseDataView - The base DataView to clone and enrich
   * @param columns - ES|QL query columns from the response
   * @returns Enriched DataView or undefined if no columns provided
   */
  enrich(baseDataView: DataView, columns: DatatableColumn[] | undefined): DataView | undefined;

  /**
   * Clears the internal cache. Useful for cleanup or testing.
   */
  clear(): void;
}

/**
 * Creates a memoized ES|QL DataView enricher.
 *
 * This factory returns an enricher that creates an enriched DataView with ES|QL
 * column fields, but only recreates it when:
 * - The columns schema changes (different fields, types, or esTypes)
 * - The base DataView changes (different ID)
 *
 * The enriched DataView always includes the time field from the base DataView
 * (if present) to ensure `isTimeBased()` and `getTimeField()` work correctly.
 * This maintains backwards compatibility with pre-columnsMeta behavior.
 *
 * @example
 * ```typescript
 * const enricher = createEsqlDataViewEnricher();
 *
 * // First call - creates new enriched DataView
 * const dv1 = enricher.enrich(baseDataView, columns);
 *
 * // Same columns - returns cached DataView (same reference)
 * const dv2 = enricher.enrich(baseDataView, columns);
 * console.log(dv1 === dv2); // true
 *
 * // Different columns - creates new enriched DataView
 * const dv3 = enricher.enrich(baseDataView, differentColumns);
 * console.log(dv1 === dv3); // false
 * ```
 */
export function createEsqlDataViewEnricher(): EsqlDataViewEnricher {
  let cachedSignature: string | undefined;
  let cachedBaseDataViewId: string | undefined;
  let cachedDataView: DataView | undefined;

  return {
    enrich(baseDataView: DataView, columns: DatatableColumn[] | undefined): DataView | undefined {
      if (!columns || columns.length === 0) {
        return undefined;
      }

      const timeFieldName = baseDataView.timeFieldName;
      const currentSignature = getColumnsSignature(columns, timeFieldName);
      const baseDataViewId = baseDataView.id;

      if (
        currentSignature === cachedSignature &&
        baseDataViewId === cachedBaseDataViewId &&
        cachedDataView
      ) {
        return cachedDataView;
      }

      const fields = convertDatatableColumnsToFieldSpecs(columns);

      // Ensure time field is always present if base DataView has one.
      // This maintains backwards compatibility - the enriched DataView should
      // behave like the original DataView for time-based checks (isTimeBased(), getTimeField()).
      if (timeFieldName && !fields[timeFieldName]) {
        const timeField = baseDataView.getTimeField();
        if (timeField) {
          fields[timeFieldName] = timeField.toSpec();
        }
      }

      cachedDataView = baseDataView.cloneWithFields(fields);
      cachedSignature = currentSignature;
      cachedBaseDataViewId = baseDataViewId;

      return cachedDataView;
    },

    clear(): void {
      cachedSignature = undefined;
      cachedBaseDataViewId = undefined;
      cachedDataView = undefined;
    },
  };
}
