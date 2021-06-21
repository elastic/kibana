/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { Framework } from '../plugin';
import type { TimeseriesVisData } from '../../common/types';
import { PANEL_TYPES } from '../../common/enums';
import type {
  VisTypeTimeseriesVisDataRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
} from '../types';
import { getSeriesData } from './vis_data/get_series_data';
import { getTableData } from './vis_data/get_table_data';
import { getEsQueryConfig } from './vis_data/helpers/get_es_query_uisettings';
import { getCachedIndexPatternFetcher } from './search_strategies/lib/cached_index_pattern_fetcher';

export async function getVisData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesVisDataRequest,
  framework: Framework
): Promise<TimeseriesVisData> {
  const uiSettings = requestContext.core.uiSettings.client;
  const esShardTimeout = await framework.getEsShardTimeout();
  const indexPatternsService = await framework.getIndexPatternsService(requestContext);
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  const promises = request.body.panels.map((panel) => {
    const services: VisTypeTimeseriesRequestServices = {
      esQueryConfig,
      esShardTimeout,
      indexPatternsService,
      uiSettings,
      searchStrategyRegistry: framework.searchStrategyRegistry,
      cachedIndexPatternFetcher: getCachedIndexPatternFetcher(indexPatternsService, {
        fetchKibanaIndexForStringIndexes: Boolean(panel.use_kibana_indexes),
      }),
    };

    return panel.type === PANEL_TYPES.TABLE
      ? getTableData(requestContext, request, panel, services)
      : getSeriesData(requestContext, request, panel, services);
  });

  return Promise.all(promises).then((res) => {
    return res.reduce((acc, data) => {
      return _.assign(acc, data);
    }, {});
  }) as Promise<TimeseriesVisData>;
}
