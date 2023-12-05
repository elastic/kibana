/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  AggregateQuery,
  getIndexPatternFromSQLQuery,
  getIndexPatternFromESQLQuery,
} from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../build_services';

export async function getDataViewByTextBasedQueryLang(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  let indexPatternFromQuery = '';
  let isEsql = false;
  if ('sql' in query) {
    indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
  }
  if ('esql' in query) {
    indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
    isEsql = true;
  }
  // we should find a better way to work with ESQL queries which dont need a dataview
  if (!indexPatternFromQuery && currentDataView) return currentDataView;

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern()
  ) {
    const dataViewObj = await services.dataViews.create({
      title: indexPatternFromQuery,
      type: isEsql ? 'esql' : undefined,
    });

    if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}
