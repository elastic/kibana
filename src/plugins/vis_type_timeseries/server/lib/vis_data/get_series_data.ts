/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

// not typed yet
// @ts-expect-error
import { handleErrorResponse } from './handle_error_response';
import { getAnnotations } from './get_annotations';
import { handleResponseBody } from './series/handle_response_body';
import { getSeriesRequestParams } from './series/get_request_params';
import { getActiveSeries } from './helpers/get_active_series';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
  VisTypeTimeseriesRequestServices,
} from '../../types';
import type { Panel } from '../../../common/types';
import { PANEL_TYPES } from '../../../common/enums';

export async function getSeriesData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  services: VisTypeTimeseriesRequestServices
) {
  const panelIndex = await services.cachedIndexPatternFetcher(panel.index_pattern);

  const strategy = await services.searchStrategyRegistry.getViableStrategy(
    requestContext,
    req,
    panelIndex
  );

  if (!strategy) {
    throw new Error(
      i18n.translate('visTypeTimeseries.searchStrategyUndefinedErrorMessage', {
        defaultMessage: 'Search strategy was not defined',
      })
    );
  }

  const { searchStrategy, capabilities } = strategy;
  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const bodiesPromises = getActiveSeries(panel).map((series) =>
      getSeriesRequestParams(req, panel, panelIndex, series, capabilities, services)
    );

    const searches = await Promise.all(bodiesPromises);
    const data = await searchStrategy.search(requestContext, req, searches);

    const handleResponseBodyFn = handleResponseBody(panel, req, {
      indexPatternsService: services.indexPatternsService,
      cachedIndexPatternFetcher: services.cachedIndexPatternFetcher,
      searchStrategy,
      capabilities,
    });

    const series = await Promise.all(
      data.map(
        async (resp) => await handleResponseBodyFn(resp.rawResponse ? resp.rawResponse : resp)
      )
    );

    let annotations = null;

    if (panel.type === PANEL_TYPES.TIMESERIES && panel.annotations && panel.annotations.length) {
      annotations = await getAnnotations({
        req,
        panel,
        series,
        services: {
          ...services,
          requestContext,
          searchStrategy,
          capabilities,
        },
      });
    }

    return {
      ...meta,
      [panel.id]: {
        annotations,
        id: panel.id,
        series: series.reduce((acc, s) => acc.concat(s), []),
      },
    };
  } catch (err) {
    if (err.body) {
      err.response = err.body;

      return {
        ...meta,
        ...handleErrorResponse(panel)(err),
      };
    }
    return meta;
  }
}
