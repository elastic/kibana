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
import { sha256 } from './sha256';
import type { Column } from './types';
import type { EsqlSource } from './sources/esql_source';

const esqlDataViewsById = new Map<string, DataView>();

const dataViewsWithResultColumns = new WeakSet<DataView>();

const getDatasetDataViewId = async (source: EsqlSource): Promise<string> =>
  `esql-dataset-${await sha256(source.datasetKey)}`;

/**
 * Transitional shim: registers one DataView per dataset (FROM target, time field, project routing)
 * with the fields of the FROM target from field caps, falling back to the result columns for
 * sources without field caps (views, external datasets).
 */
export async function registerEsqlSourceInDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  source: EsqlSource
): Promise<DataView> {
  const spec = {
    id: await getDatasetDataViewId(source),
    title: source.title,
    type: ESQL_TYPE,
    timeFieldName: source.timeFieldName,
  };
  let dataView: DataView;
  try {
    dataView = await dataViews.create(spec, false, false);
  } catch {
    dataView = await dataViews.create(spec, true);
  }

  if (dataView.fields.length === 0 || dataViewsWithResultColumns.has(dataView)) {
    dataViews.clearInstanceCache(spec.id);
    dataView = await dataViews.create(
      { ...spec, fields: withTimeField(makeResultColumnFieldSpecs(source), source.timeFieldName) },
      true
    );
    dataViewsWithResultColumns.add(dataView);
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
  source: EsqlSource
): Promise<DataView> {
  return getRegisteredEsqlDataView(source) ?? registerEsqlSourceInDataViewsCache(dataViews, source);
}

export function unregisterFromDataViewsCache(
  dataViews: DataViewsPublicPluginStart,
  id: string
): void {
  esqlDataViewsById.delete(id);
  dataViews.clearInstanceCache(id);
}

function makeResultColumnFieldSpecs(source: EsqlSource): Record<string, FieldSpec> {
  return Object.fromEntries(
    source.getColumns().map((column) => [column.name, columnToFieldSpec(column)])
  );
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
    aggregatable: column.type === KBN_FIELD_TYPES.DATE,
    isComputedColumn: column.source === 'esql-result',
  };
}
