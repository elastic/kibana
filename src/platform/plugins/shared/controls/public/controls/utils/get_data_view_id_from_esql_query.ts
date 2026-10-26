/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { apiPublishesDataSources } from '@kbn/presentation-publishing';
import { coreServices, dataViewsService } from '../../services/kibana_services';

interface Options {
  parentApi?: unknown;
}

export const getDataViewIdFromESQLQuery = async (query: string, options: Options = {}) => {
  const preferredDataViews = apiPublishesDataSources(options.parentApi)
    ? options.parentApi.dataSources$.value
    : undefined;

  const indexPattern = getIndexPatternFromESQLQuery(query);
  const existingDataView = preferredDataViews?.find(({ title }) => title === indexPattern);
  if (existingDataView?.id) {
    return existingDataView.id;
  }

  const [dataView] = await dataViewsService.find(indexPattern);
  if (dataView) {
    return dataView.id;
  }

  const adHocDataView = await getESQLAdHocDataview({
    dataViewsService,
    query,
    http: coreServices?.http,
  });
  return adHocDataView.id;
};
