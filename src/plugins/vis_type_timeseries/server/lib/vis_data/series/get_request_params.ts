/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PanelSchema, SeriesItemsSchema } from '../../../../common/types';
import { buildRequestBody } from './build_request_body';
import { VisTypeTimeseriesRequestServices, VisTypeTimeseriesVisDataRequest } from '../../../types';
import { DefaultSearchCapabilities } from '../../search_strategies';

export async function getSeriesRequestParams(
  req: VisTypeTimeseriesVisDataRequest,
  panel: PanelSchema,
  series: SeriesItemsSchema,
  capabilities: DefaultSearchCapabilities,
  {
    esQueryConfig,
    esShardTimeout,
    uiSettings,
    cachedIndexPatternFetcher,
  }: VisTypeTimeseriesRequestServices
) {
  const { indexPattern, indexPatternString } = await cachedIndexPatternFetcher(
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern
  );

  const request = await buildRequestBody(
    req,
    panel,
    series,
    esQueryConfig,
    indexPattern,
    capabilities,
    uiSettings
  );

  return {
    index: indexPatternString,
    body: {
      ...request,
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
  };
}
