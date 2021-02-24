/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type { PanelSchema } from 'src/plugins/vis_type_timeseries/common/types';
import { getSeriesRequestParams } from './series/get_request_params';
import { handleResponseBody } from './series/handle_response_body';
import { handleErrorResponse } from './handle_error_response';
import { getAnnotations } from './get_annotations';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getActiveSeries } from './helpers/get_active_series';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import { Framework } from '../../plugin';

export async function getSeriesData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: PanelSchema,
  framework: Framework
) {
  const strategy = await framework.searchStrategyRegistry.getViableStrategyForPanel(
    requestContext,
    req,
    panel
  );

  if (!strategy) {
    throw new Error(
      i18n.translate('visTypeTimeseries.searchStrategyUndefinedErrorMessage', {
        defaultMessage: 'Search strategy was not defined',
      })
    );
  }

  const { searchStrategy, capabilities } = strategy;
  const esQueryConfig = await getEsQueryConfig(requestContext);
  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const bodiesPromises = getActiveSeries(panel).map((series) =>
      getSeriesRequestParams(req, panel, series, esQueryConfig, capabilities)
    );

    const searches = (await Promise.all(bodiesPromises)).reduce(
      (acc, items) => acc.concat(items),
      []
    );
    const data = await searchStrategy.search(requestContext, req, searches);

    const handleResponseBodyFn = handleResponseBody(panel, req, searchStrategy, capabilities);

    const series = await Promise.all(
      data.map(
        async (resp) => await handleResponseBodyFn(resp.rawResponse ? resp.rawResponse : resp)
      )
    );

    let annotations = null;

    if (panel.annotations && panel.annotations.length) {
      annotations = await getAnnotations({
        req,
        panel,
        series,
        esQueryConfig,
        searchStrategy,
        capabilities,
      });
    }

    return {
      ...meta,
      [panel.id]: {
        annotations,
        id: panel.id,
        series: series.reduce((acc, series) => acc.concat(series), []),
      },
    };
  } catch (err) {
    if (err.body || err.name === 'KQLSyntaxError') {
      err.response = err.body;

      return {
        ...meta,
        ...handleErrorResponse(panel)(err),
      };
    }
  }
}
