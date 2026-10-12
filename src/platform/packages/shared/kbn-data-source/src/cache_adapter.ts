/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { getESQLAdHocDataviewId } from '@kbn/esql-utils';
import type { Column } from './types';
import type { EsqlSource } from './sources/esql_source';

const esqlDataViewsById = new Map<string, DataView>();

// LIMIT 0 reports no aggregatability. Heuristic for KQL value suggestions (_terms_enum / terms agg):
// analyzed text types can't be suggested, `unsupported` types are unknown. Exact only with field caps.
const NON_AGGREGATABLE_ES_TYPES: ReadonlySet<string> = new Set([
  'text',
  'match_only_text',
  'semantic_text',
  'unsupported',
]);

/** Same id as the legacy ES|QL ad-hoc DataView, so persisted filters and Lens keep resolving it. */
const getDatasetDataViewId = (source: EsqlSource): Promise<string> =>
  getESQLAdHocDataviewId({
    indexPattern: source.title,
    timeFieldName: source.timeFieldName,
    projectRouting: source.projectRouting,
  });

/**
 * Transitional shim: registers one DataView per dataset (FROM target, time field, project routing)
 * whose fields are the source's filterable fields, never fetched from field caps.
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource,
  http?: HttpStart
): Promise<DataView> {
  const id = await getDatasetDataViewId(source);
  const filterableFields = await source.getFilterableFields(http);
  const spec = {
    id,
    title: source.title,
    type: ESQL_TYPE,
    timeFieldName: source.timeFieldName,
    fields: withTimeField(makeFieldSpecs(filterableFields), source.timeFieldName),
  };
  let dataView = await dataViews.create(spec, true);
  // The id is shared with the legacy ad-hoc DataView, which `getESQLAdHocDataview` callers (e.g.
  // Lens text_based) or a hydrated saved search source may have cached with field caps fields
  // (none for views). Replace it when it lacks the dataset's fields.
  // TODO: remove once Lens and the remaining callers produce an `EsqlSource` instead.
  if (filterableFields.some(({ name }) => !dataView.fields.getByName(name))) {
    dataViews.clearInstanceCache(id);
    dataView = await dataViews.create(spec, true);
  }
  // A failed schema lookup yields no fields; don't keep that DataView so the next query retries.
  if (!filterableFields.length) {
    dataViews.clearInstanceCache(id);
  }

  esqlDataViewsById.set(source.id, dataView);
  return dataView;
}

/** DataView shim already registered for this ES|QL source. */
export function getRegisteredEsqlDataView(source: EsqlSource): DataView | undefined {
  return esqlDataViewsById.get(source.id);
}

/** DataView shim for Lens, reusing the one registered for this source. */
export async function getOrRegisterEsqlDataView(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource,
  http?: HttpStart
): Promise<DataView> {
  return (
    getRegisteredEsqlDataView(source) ?? registerEsqlSourceInDataViewsCache(dataViews, source, http)
  );
}

/** The dataset DataView stays registered, as other queries on the same dataset share it. */
export function unregisterFromDataViewsCache(id: string): void {
  esqlDataViewsById.delete(id);
}

function makeFieldSpecs(columns: readonly Column[]): Record<string, FieldSpec> {
  return Object.fromEntries(columns.map((column) => [column.name, columnToFieldSpec(column)]));
}

function withTimeField(
  fields: Record<string, FieldSpec>,
  timeFieldName: string | undefined
): Record<string, FieldSpec> {
  if (!timeFieldName || fields[timeFieldName]) {
    return fields;
  }
  return {
    ...fields,
    [timeFieldName]: {
      name: timeFieldName,
      type: KBN_FIELD_TYPES.DATE,
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      isComputedColumn: false,
    },
  };
}

function columnToFieldSpec(column: Column): FieldSpec {
  return {
    name: column.name,
    type: column.type,
    esTypes: column.esType ? [column.esType] : undefined,
    searchable: true,
    aggregatable: !column.esType || !NON_AGGREGATABLE_ES_TYPES.has(column.esType),
    isComputedColumn: column.source === 'esql-result',
  };
}
