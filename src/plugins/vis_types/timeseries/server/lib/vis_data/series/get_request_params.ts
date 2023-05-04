/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { buildRequestBody } from './build_request_body';

import type { FetchedIndexPattern, Panel, Series } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import type { SearchCapabilities, EsSearchRequest } from '../../search_strategies';

export async function getSeriesRequestParams(
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  panelIndex: FetchedIndexPattern,
  series: Series,
  capabilities: SearchCapabilities,
  {
    esQueryConfig,
    esShardTimeout,
    uiSettings,
    cachedIndexPatternFetcher,
    buildSeriesMetaParams,
  }: VisTypeTimeseriesRequestServices
): Promise<EsSearchRequest> {
  let seriesIndex = panelIndex;

  if (series.override_index_pattern) {
    seriesIndex = await cachedIndexPatternFetcher(series.series_index_pattern ?? '');
  }

  const request = await buildRequestBody(
    req,
    panel,
    series,
    esQueryConfig,
    seriesIndex,
    capabilities,
    uiSettings,
    () => buildSeriesMetaParams(seriesIndex, Boolean(panel.use_kibana_indexes), series)
  );

  return {
    index: seriesIndex.indexPatternString,
    body: {
      ...request,
      runtime_mappings: seriesIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
    trackingEsSearchMeta: {
      requestId: series.id,
      requestLabel: i18n.translate('visTypeTimeseries.seriesRequest.label', {
        defaultMessage: 'Series: {id}',
        values: {
          id: series.id,
        },
      }),
    },
  };
}
