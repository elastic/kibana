/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Column } from './types';
import type { EsqlSource } from './sources/esql_source';

interface RegisteredEsqlDataView {
  signature: string;
  dataView: DataView;
}

/**
 * Last shim built for an ES|QL id. Histogram fetches reuse it when the schema
 * still matches, instead of clearing the DataViews cache on every chart request.
 */
const esqlDataViewsById = new Map<string, RegisteredEsqlDataView>();

/**
 * Transitional shim. Registers a DataView in the `dataViewsService` cache so that
 * consumers still calling `dataViewsService.get(id)` for ES|QL ids keep resolving
 * (filter editor, generateFilters meta.index).
 *
 * Uses `skipFetchFields: true` — never call `_field_caps`. Fields are copied from
 * `EsqlSource.getColumns()` (LIMIT 0 / source_info). The cache is cleared first so
 * re-registration picks up a new schema or time field. Histogram fetches should
 * call {@link getOrRegisterEsqlDataView} so an unchanged schema keeps this instance.
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource
): Promise<DataView> {
  esqlDataViewsById.delete(source.id);
  dataViews.clearInstanceCache(source.id);
  const dataView = await dataViews.create(
    {
      id: source.id,
      title: source.title,
      type: ESQL_TYPE,
      timeFieldName: source.timeFieldName,
      fields: makeShimFieldSpecs(source),
    },
    true // skipFetchFields — never call _field_caps for ES|QL adapter DVs
  );
  esqlDataViewsById.set(source.id, {
    signature: shimSchemaSignature(source),
    dataView,
  });
  return dataView;
}

function getCachedEsqlDataView(source: EsqlSource): DataView | undefined {
  const cached = esqlDataViewsById.get(source.id);
  if (cached?.signature === shimSchemaSignature(source)) {
    return cached.dataView;
  }
  return undefined;
}

/**
 * DataView shim already registered for this ES|QL source, when the field names
 * and time field still match. Lens reads this instead of carrying a DataView
 * next to the data source.
 */
export function getRegisteredEsqlDataView(source: EsqlSource): DataView | undefined {
  return getCachedEsqlDataView(source);
}

/**
 * DataView shim for Lens. Reuses the view already registered for this id when
 * the field names and time field still match. Rebuilds only when the schema or
 * time field changed, so a chart fetch does not drop the shim the documents
 * path and the filter editor are using. `withColumns` keeps the same id and
 * only overlays nullability, which does not rebuild the shim.
 */
export async function getOrRegisterEsqlDataView(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource
): Promise<DataView> {
  const cached = getCachedEsqlDataView(source);
  if (cached) {
    return cached;
  }
  return registerEsqlSourceInDataViewsCache(dataViews, source);
}

export function unregisterFromDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  id: string
): void {
  esqlDataViewsById.delete(id);
  dataViews.clearInstanceCache(id);
}

/**
 * Field names the shim would contain, plus the time field. Order does not
 * matter. Nullability is omitted: `withColumns` updates it on the same id.
 */
function shimSchemaSignature(source: EsqlSource): string {
  const names = new Set(source.getColumns().map((column) => column.name));
  if (source.timeFieldName) {
    names.add(source.timeFieldName);
  }
  return `${source.timeFieldName ?? ''}:${[...names].sort().join('\0')}`;
}

/**
 * Copies LIMIT 0 columns onto the shim so `dataViews.get(esql-id)` has the same
 * names as the query (needed by the dashboard filter editor). If the time field
 * is not in the result columns, it is still injected so `DataView.isTimeBased()`
 * stays true.
 */
function makeShimFieldSpecs(source: EsqlSource): Record<string, FieldSpec> {
  const fields: Record<string, FieldSpec> = {};

  for (const column of source.getColumns()) {
    fields[column.name] = columnToFieldSpec(column);
  }

  if (source.timeFieldName && !fields[source.timeFieldName]) {
    fields[source.timeFieldName] = {
      name: source.timeFieldName,
      type: KBN_FIELD_TYPES.DATE,
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      isComputedColumn: false,
    };
  }

  return fields;
}

function columnToFieldSpec(column: Column): FieldSpec {
  return {
    name: column.name,
    type: column.type,
    esTypes: column.esType ? [column.esType] : undefined,
    searchable: true,
    aggregatable: column.type === KBN_FIELD_TYPES.DATE,
    isComputedColumn: column.source === 'esql-result',
  };
}
