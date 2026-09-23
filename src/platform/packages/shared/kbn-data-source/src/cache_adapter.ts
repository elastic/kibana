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

/**
 * Transitional shim. Registers a DataView in the `dataViewsService` cache so that
 * consumers still calling `dataViewsService.get(id)` for ES|QL ids keep resolving
 * (filter editor, generateFilters meta.index).
 *
 * Uses `skipFetchFields: true` — never call `_field_caps`. Fields are copied from
 * `EsqlSource.getColumns()` (LIMIT 0 / source_info). The cache is cleared first so
 * re-registration picks up a new schema or time field.
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
      fields: makeShimFieldSpecs(source),
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
