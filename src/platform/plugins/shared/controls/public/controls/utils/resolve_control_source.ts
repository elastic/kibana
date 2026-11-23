/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import { DataViewSource } from '@kbn/data-source';
import type { DataSource, FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { coreServices, dataViewsService } from '../../services/kibana_services';
import { getSourceFromESQLQuery } from './get_source_from_esql_query';

export interface FieldSourceKey {
  valuesSource: ControlValuesSource.FIELD;
  dataViewId?: string;
}
export interface EsqlSourceKey {
  valuesSource: ControlValuesSource.ESQL;
  esqlQuery: string;
}
/** What identifies the source of a control: a data view for a field, the query for a "Write a query" control */
export type ControlSourceKey = FieldSourceKey | EsqlSourceKey;

/** A data source of a control, and what filtering needs from it, which the controls build their filters from */
export interface ControlSource {
  dataSource: DataSource;
  filterableSource: FilterableSource;
}

/** The data source that a control reads its values from: a data view for a field, what the query reads for a query. */
export const resolveControlSource = async (
  key: ControlSourceKey,
  { parentApi }: { parentApi?: unknown } = {}
): Promise<ControlSource> => {
  const dataSource = await getDataSource(key, parentApi);
  return { dataSource, filterableSource: await dataSource.toFilterableSource(coreServices?.http) };
};

/** The data view of a data source, which only a data source of a data view has. */
export const getDataViewOfSource = (dataSource: DataSource | undefined): DataView | undefined =>
  dataSource?.kind === 'index-pattern' ? dataSource.getDataView() : undefined;

const getDataSource = async (key: ControlSourceKey, parentApi?: unknown): Promise<DataSource> => {
  if (key.valuesSource !== ControlValuesSource.ESQL) {
    return new DataViewSource(await dataViewsService.get(key.dataViewId ?? ''));
  }

  if (!key.esqlQuery) {
    throw new Error(
      i18n.translate('controls.dataControl.esqlMissingQuery', {
        defaultMessage: 'Variable control is missing a query',
      })
    );
  }
  return getSourceFromESQLQuery(key.esqlQuery, { parentApi });
};
