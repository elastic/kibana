/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { Framework } from '../plugin';
import type { TimeseriesVisData, FetchedIndexPattern, Series } from '../../common/types';
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
import { getIntervalAndTimefield } from './vis_data/get_interval_and_timefield';
import { UI_SETTINGS } from '../../common/constants';

export async function getVisData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesVisDataRequest,
  framework: Framework
): Promise<TimeseriesVisData> {
  const uiSettings = (await requestContext.core).uiSettings.client;
  const esShardTimeout = await framework.getEsShardTimeout();
  const fieldFormatService = await framework.getFieldFormatsService(uiSettings);
  const indexPatternsService = await framework.getIndexPatternsService(requestContext);
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  const promises = request.body.panels.map((panel) => {
    const cachedIndexPatternFetcher = getCachedIndexPatternFetcher(indexPatternsService, {
      fetchKibanaIndexForStringIndexes: Boolean(panel.use_kibana_indexes),
    });
    const services: VisTypeTimeseriesRequestServices = {
      esQueryConfig,
      esShardTimeout,
      fieldFormatService,
      indexPatternsService,
      uiSettings,
      cachedIndexPatternFetcher,
      searchStrategyRegistry: framework.searchStrategyRegistry,
      buildSeriesMetaParams: async (
        index: FetchedIndexPattern,
        useKibanaIndexes: boolean,
        series?: Series
      ) => {
        /** This part of code is required to try to get the default timefield for string indices.
         *  The rest of the functionality available for Kibana indexes should not be active **/
        if (!useKibanaIndexes && index.indexPatternString) {
          index = await cachedIndexPatternFetcher(index.indexPatternString, true);
        }

        const maxBuckets = await uiSettings.get<number>(UI_SETTINGS.MAX_BUCKETS_SETTING);
        const { min, max } = request.body.timerange;

        return getIntervalAndTimefield(
          panel,
          index,
          {
            min,
            max,
            maxBuckets,
          },
          series
        );
      },
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
