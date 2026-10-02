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
import { getESQLSourceInfo } from '@kbn/esql-utils';
import { esFieldTypeToKibanaFieldType, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Column } from './types';
import type { EsqlSource } from './sources/esql_source';

interface RegisteredEsqlDataView {
  timeFieldName: string | undefined;
  /** Set only when the fields were taken from the result columns, which are specific to the query. */
  resultColumnsSignature: string | undefined;
  dataView: DataView;
}

type FieldSpecMap = Record<string, FieldSpec>;

/**
 * Last shim built for an ES|QL id. Histogram fetches reuse it while the time field still
 * matches, instead of clearing the DataViews cache on every chart request.
 */
const esqlDataViewsById = new Map<string, RegisteredEsqlDataView>();

/**
 * Transitional shim. Registers a DataView in the `dataViewsService` cache so that
 * consumers still calling `dataViewsService.get(id)` for ES|QL ids keep resolving
 * (filter editor, generateFilters meta.index), and so that unified search, KQL and the
 * dashboard filter UI get a DataView whose fields are the ones a filter can target.
 *
 * The fields are the schema of the FROM target (see {@link resolveSourceFieldSpecs}), not the
 * result columns of the query, and never come from `_field_caps`. The cache is cleared
 * first so re-registration picks up a new schema or time field. Histogram fetches should call
 * {@link getOrRegisterEsqlDataView} so an unchanged source keeps this instance.
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource,
  http?: HttpStart
): Promise<DataView> {
  esqlDataViewsById.delete(source.id);
  dataViews.clearInstanceCache(source.id);
  const sourceFieldSpecs = await resolveSourceFieldSpecs(source, http);
  const dataView = await dataViews.create(
    {
      id: source.id,
      title: source.title,
      type: ESQL_TYPE,
      timeFieldName: source.timeFieldName,
      fields: withTimeField(
        sourceFieldSpecs ? toFieldSpecMap(sourceFieldSpecs) : makeResultColumnFieldSpecs(source),
        source.timeFieldName
      ),
    },
    true // skipFetchFields — never call _field_caps for ES|QL adapter DVs
  );
  esqlDataViewsById.set(source.id, {
    timeFieldName: source.timeFieldName,
    resultColumnsSignature: sourceFieldSpecs ? undefined : resultColumnsSignature(source),
    dataView,
  });
  return dataView;
}

function getCachedEsqlDataView(source: EsqlSource): DataView | undefined {
  const cached = esqlDataViewsById.get(source.id);
  if (
    cached &&
    cached.timeFieldName === source.timeFieldName &&
    (cached.resultColumnsSignature === undefined ||
      cached.resultColumnsSignature === resultColumnsSignature(source))
  ) {
    return cached.dataView;
  }
  return undefined;
}

/**
 * DataView shim already registered for this ES|QL source, when the time field
 * (and, if the shim fell back to result columns, the column names) still match.
 * Lens reads this instead of carrying a DataView next to the data source.
 */
export function getRegisteredEsqlDataView(source: EsqlSource): DataView | undefined {
  return getCachedEsqlDataView(source);
}

/**
 * DataView shim for Lens. Reuses the view already registered for this id when
 * the time field still matches, so a chart fetch does not drop the shim the
 * documents path and the filter editor are using. `withColumns` keeps the same
 * id and only overlays nullability, which does not rebuild the shim.
 */
export async function getOrRegisterEsqlDataView(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource,
  http?: HttpStart
): Promise<DataView> {
  const cached = getCachedEsqlDataView(source);
  if (cached) {
    return cached;
  }
  return registerEsqlSourceInDataViewsCache(dataViews, source, http);
}

export function unregisterFromDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  id: string
): void {
  esqlDataViewsById.delete(id);
  dataViews.clearInstanceCache(id);
}

function resultColumnsSignature(source: EsqlSource): string {
  return source
    .getColumns()
    .map((column) => column.name)
    .sort()
    .join('\0');
}

/**
 * Fields of the FROM target: the columns of `FROM <source> | LIMIT 0`. Filters are applied to the
 * source documents before the pipeline runs, so these, and not the result columns of the query,
 * are the fields a filter or KQL can target. `getESQLSourceInfo` caches by query, and the bare
 * `FROM` is the same for every query on the dataset, so this is one request per dataset. Resolves
 * to `undefined` when the schema cannot be fetched.
 */
async function resolveSourceFieldSpecs(
  source: EsqlSource,
  http?: HttpStart
): Promise<FieldSpec[] | undefined> {
  if (!http || !source.title) {
    return undefined;
  }
  try {
    const { columns } = await getESQLSourceInfo({
      query: `FROM ${source.title}`,
      http,
      projectRouting: source.projectRouting,
    });
    return columns.length > 0
      ? columns.map(({ name, esType }) =>
          columnToFieldSpec({
            name,
            type: esFieldTypeToKibanaFieldType(esType) as KBN_FIELD_TYPES,
            esType,
            source: 'index',
          })
        )
      : undefined;
  } catch {
    return undefined;
  }
}

function toFieldSpecMap(specs: FieldSpec[]): FieldSpecMap {
  return Object.fromEntries(specs.map((spec) => [spec.name, spec]));
}

/**
 * Last resort when the source schema cannot be resolved: the result columns of the query.
 */
function makeResultColumnFieldSpecs(source: EsqlSource): FieldSpecMap {
  return Object.fromEntries(
    source.getColumns().map((column) => [column.name, columnToFieldSpec(column)])
  );
}

/**
 * If the time field is not among the fields, it is still injected so `DataView.isTimeBased()`
 * stays true.
 */
function withTimeField(fields: FieldSpecMap, timeFieldName: string | undefined): FieldSpecMap {
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
    aggregatable: column.type === KBN_FIELD_TYPES.DATE,
    isComputedColumn: column.source === 'esql-result',
  };
}
