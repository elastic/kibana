/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { EsqlSource } from './sources/esql_source';

/**
 * Transitional shim. Registers a thin DataView in the `dataViewsService` cache so that
 * consumers still calling `dataViewsService.get(id)` for ES|QL ids keep resolving.
 * Delete this file once all such consumers migrate to `DataSourceService.get()`.
 *
 * Uses `skipFetchFields: true` — never call `_field_caps`. Query columns live on
 * `EsqlSource`; the shim only injects `timeFieldName` so `DataView.isTimeBased()`
 * stays true. The cache is cleared first so re-registration picks up a new time field.
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource
): Promise<DataView> {
  dataViews.clearInstanceCache(source.id);
  const dataView = await dataViews.create(
    {
      id: source.id,
      title: source.title,
      type: ESQL_TYPE,
      timeFieldName: source.timeFieldName,
      fields: makeTimeFieldSpec(source.timeFieldName),
    },
    true // skipFetchFields — never call _field_caps for ES|QL adapter DVs
  );
  return dataView;
}

export function unregisterFromDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  id: string
): void {
  dataViews.clearInstanceCache(id);
}

/**
 * `DataView.isTimeBased()` requires the time field to exist in `fields`, not just
 * `timeFieldName` on the spec. Query result columns are not copied — they belong
 * on `EsqlSource.getColumns()`.
 */
function makeTimeFieldSpec(timeFieldName?: string) {
  if (!timeFieldName) {
    return {};
  }

  return {
    [timeFieldName]: {
      name: timeFieldName,
      type: KBN_FIELD_TYPES.DATE,
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
    },
  };
}
