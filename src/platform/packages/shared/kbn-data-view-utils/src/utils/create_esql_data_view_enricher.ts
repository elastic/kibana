/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnsToFieldSpecs } from './convert_to_data_view_field_spec';

export interface EsqlDataViewEnrichOptions {
  keepTimeField?: boolean;
}

/**
 * Creates a stable signature from the final field specs used for cloning.
 */
function getFieldsSignature(fields: Record<string, FieldSpec>, timeFieldName?: string): string {
  const colsSignature = Object.values(fields)
    .map((field) => `${field.name}:${field.type ?? 'unknown'}:${field.esTypes?.join(',') ?? ''}`)
    .sort()
    .join('|');
  return `${colsSignature}|tf:${timeFieldName ?? 'none'}`;
}

function injectTimeFieldSpec({
  baseDataView,
  fields,
  options,
}: {
  baseDataView: DataView;
  fields: Record<string, FieldSpec>;
  options?: EsqlDataViewEnrichOptions;
}): Record<string, FieldSpec> {
  if (
    !options?.keepTimeField ||
    !baseDataView.timeFieldName ||
    fields[baseDataView.timeFieldName]
  ) {
    return fields;
  }

  const timeField = baseDataView.getFieldByName(baseDataView.timeFieldName);
  if (!timeField) {
    return fields;
  }

  return {
    ...fields,
    [timeField.name]: {
      name: timeField.name,
      type: timeField.type,
      esTypes: timeField.esTypes,
      searchable: timeField.searchable,
      aggregatable: timeField.aggregatable,
    },
  };
}

export interface EsqlDataViewEnricher {
  /**
   * Returns an enriched DataView with ES|QL column fields.
   * Reuses cached DataView if columns and base DataView haven't changed.
   *
   * @param baseDataView - The base DataView to clone and enrich
   * @param columns - ES|QL query columns from the response
   * @param options - Enrichment options
   * @returns Enriched DataView or undefined if no columns provided
   */
  enrich(
    baseDataView: DataView,
    columns: DatatableColumn[] | undefined,
    options?: EsqlDataViewEnrichOptions
  ): DataView | undefined;

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
 * The enriched DataView is created using `cloneWithFields()`, which automatically
 * clears `timeFieldName` if the time field is not present in the ES|QL columns.
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
    enrich(
      baseDataView: DataView,
      columns: DatatableColumn[] | undefined,
      options?: EsqlDataViewEnrichOptions
    ): DataView | undefined {
      if (!columns || columns.length === 0) {
        return undefined;
      }

      const fields = injectTimeFieldSpec({
        baseDataView,
        fields: convertDatatableColumnsToFieldSpecs(columns),
        options,
      });
      const currentSignature = getFieldsSignature(fields, baseDataView.timeFieldName);
      const baseDataViewId = baseDataView.id;

      if (
        currentSignature === cachedSignature &&
        baseDataViewId === cachedBaseDataViewId &&
        cachedDataView
      ) {
        return cachedDataView;
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
