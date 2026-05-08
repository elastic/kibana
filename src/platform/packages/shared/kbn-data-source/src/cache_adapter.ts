/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { EsqlSource } from './esql_source';
import type { Column } from './types';

/**
 * Registers a thin DataView in the `dataViewsService` cache for the given
 * `EsqlSource` so that unmigrated consumers calling
 * `dataViewsService.get(id)` resolve to a DataView with the right id, title,
 * timeFieldName, and field list.
 *
 * Transitional shim. Phase 4 migrates remaining cross-cutting consumers off
 * `dataViewsService.get()` for ES|QL ids and we delete this file.
 *
 * Uses `skipFetchFields: true` so no `_field_caps` request is made — the
 * fields come directly from the `EsqlSource`'s columns. The cached instance
 * is cleared first so re-registration with the same id picks up fresh
 * column metadata when the query changes.
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource
): Promise<void> {
  dataViews.clearInstanceCache(source.id);
  await dataViews.create(
    {
      id: source.id,
      title: source.title,
      type: ESQL_TYPE,
      timeFieldName: source.timeFieldName,
      fields: makeFieldsSpec(source.getColumns()),
    },
    true // skipFetchFields — never call _field_caps for ES|QL adapter DVs
  );
}

/**
 * Removes the EsqlSource's adapter DataView from the `dataViewsService`
 * cache. Symmetric counterpart of {@link registerEsqlSourceInDataViewsCache}.
 */
export function unregisterFromDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  id: string
): void {
  dataViews.clearInstanceCache(id);
}

function makeFieldsSpec(columns: readonly Column[]) {
  return Object.fromEntries(
    columns.map((col) => [
      col.name,
      {
        name: col.name,
        type: col.type,
        esTypes: col.esType ? [col.esType] : undefined,
        searchable: true,
        aggregatable: true,
      },
    ])
  );
}
