/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery } from '@kbn/es-query';
import {
  getESQLAdHocDataview,
  getIndexPatternFromSQLQuery,
  getIndexPatternFromESQLQuery,
} from '@kbn/esql-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../build_services';

export async function getDataViewByTextBasedQueryLang(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  let indexPatternFromQuery = '';
  if ('sql' in query) {
    indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
  }
  if ('esql' in query) {
    indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
  }
  // we should find a better way to work with ESQL queries which dont need a dataview
  if (!indexPatternFromQuery && currentDataView) {
    // Here the user used either the ROW or SHOW META / SHOW INFO commands
    // if we use the current dataview will create this error https://github.com/elastic/kibana/issues/163417
    // so we are creating an adhoc dataview without an @timestamp timeFieldName
    return await getESQLAdHocDataview(currentDataView.name, services.dataViews);
  }

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern()
  ) {
    const dataViewObj = await getESQLAdHocDataview(indexPatternFromQuery, services.dataViews);

    if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}
