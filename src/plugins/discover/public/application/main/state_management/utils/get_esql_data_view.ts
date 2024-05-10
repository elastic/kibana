/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../../../build_services';

export async function getEsqlDataView(
  query: AggregateQuery,
  currentDataView: DataView | undefined,
  services: DiscoverServices
) {
  const indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern()
  ) {
    const dataViewObj = await getESQLAdHocDataview(indexPatternFromQuery, services.dataViews);

    // If the indexPatternFromQuery is empty string means that the user used either the ROW or SHOW META / SHOW INFO commands
    // we don't want to add the @timestamp field in this case https://github.com/elastic/kibana/issues/163417
    if (indexPatternFromQuery && dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}
