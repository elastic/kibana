/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AggregateQuery, getIndexPatternFromSQLQuery } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../build_services';

export async function getDataViewByTextBasedQueryLang(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  const text = 'sql' in query ? query.sql : undefined;

  const indexPatternFromQuery = getIndexPatternFromSQLQuery(text);
  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern()
  ) {
    const dataViewObj = await services.dataViews.create({
      title: indexPatternFromQuery,
    });

    if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}
