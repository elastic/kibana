/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource, EsqlSource } from '@kbn/data-source';
import type { DataSource } from '@kbn/data-source';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { apiPublishesDataSources, apiPublishesProjectRouting } from '@kbn/presentation-publishing';
import { coreServices, dataViewsService } from '../../services/kibana_services';

interface Options {
  parentApi?: unknown;
}

/**
 * The data source that an ES|QL query reads: a parent-published or a saved data view of its
 * index pattern when there is one, otherwise an ES|QL source, with no ad hoc data view.
 */
export const getSourceFromESQLQuery = async (
  query: string,
  options: Options = {}
): Promise<DataSource> => {
  const preferredSources = apiPublishesDataSources(options.parentApi)
    ? options.parentApi.dataSources$.value
    : undefined;

  const indexPattern = getIndexPatternFromESQLQuery(query);
  const publishedSource = preferredSources?.find(({ title }) => title === indexPattern);
  if (publishedSource?.id) {
    const publishedDataView = await dataViewsService
      .get(publishedSource.id, false)
      .catch(() => undefined);
    if (publishedDataView?.id) {
      return new DataViewSource(publishedDataView);
    }
  }

  const [dataView] = await dataViewsService.find(indexPattern);
  if (dataView?.id) {
    return new DataViewSource(await dataViewsService.get(dataView.id));
  }

  const projectRouting = apiPublishesProjectRouting(options.parentApi)
    ? options.parentApi.projectRouting$.value
    : undefined;
  return EsqlSource.forDataset({ query, http: coreServices?.http, projectRouting });
};
