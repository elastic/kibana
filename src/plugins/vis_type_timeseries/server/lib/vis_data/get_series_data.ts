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
import { handleResponseBody } from './series/handle_response_body';
// @ts-expect-error
import { handleErrorResponse } from './handle_error_response';
// @ts-expect-error
import { getAnnotations } from './get_annotations';
import { getSeriesRequestParams } from './series/get_request_params';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getActiveSeries } from './helpers/get_active_series';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import type { Framework } from '../../plugin';
import type { PanelSchema } from '../../../common/types';

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
  const uiSettings = requestContext.core.uiSettings.client;
  const esQueryConfig = await getEsQueryConfig(uiSettings);
  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };
  const services = {
    esQueryConfig,
    capabilities,
    framework,
    uiSettings,
    requestContext,
  };

  try {
    const bodiesPromises = getActiveSeries(panel).map((series) =>
      getSeriesRequestParams(req, panel, series, services)
    );

    const searches = await Promise.all(bodiesPromises);
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
        series,
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
