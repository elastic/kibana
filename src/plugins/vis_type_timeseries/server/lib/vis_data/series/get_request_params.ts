/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildRequestBody } from './build_request_body';
import { getIntervalAndTimefield } from '../get_interval_and_timefield';

import type { FetchedIndexPattern, Panel, Series } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import type { DefaultSearchCapabilities } from '../../search_strategies';

export async function getSeriesRequestParams(
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  panelIndex: FetchedIndexPattern,
  series: Series,
  capabilities: DefaultSearchCapabilities,
  {
    esQueryConfig,
    esShardTimeout,
    uiSettings,
    cachedIndexPatternFetcher,
  }: VisTypeTimeseriesRequestServices
) {
  let seriesIndex = panelIndex;

  if (series.override_index_pattern) {
    seriesIndex = await cachedIndexPatternFetcher(series.series_index_pattern ?? '');
  }

  const buildSeriesMetaParams = async () => {
    let index = seriesIndex;

    /** This part of code is required to try to get the default timefield for string indices.
     *  The rest of the functionality available for Kibana indexes should not be active **/
    if (!panel.use_kibana_indexes && index.indexPatternString) {
      index = await cachedIndexPatternFetcher(index.indexPatternString, true);
    }

    return getIntervalAndTimefield(panel, index, series);
  };

  const request = await buildRequestBody(
    req,
    panel,
    series,
    esQueryConfig,
    seriesIndex,
    capabilities,
    uiSettings,
    buildSeriesMetaParams
  );

  return {
    index: seriesIndex.indexPatternString,
    body: {
      ...request,
      runtime_mappings: seriesIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
  };
}
