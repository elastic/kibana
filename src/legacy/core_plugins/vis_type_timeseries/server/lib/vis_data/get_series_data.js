/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { getSeriesRequestParams } from './series/get_request_params';
import { handleResponseBody } from './series/handle_response_body';
import { handleErrorResponse } from './handle_error_response';
import { getAnnotations } from './get_annotations';
import { SearchStrategiesRegister } from '../search_strategies/search_strategies_register';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getActiveSeries } from './helpers/get_active_series';

export async function getSeriesData(req, panel) {
  const { searchStrategy, capabilities } = await SearchStrategiesRegister.getViableStrategyForPanel(
    req,
    panel
  );
  const searchRequest = searchStrategy.getSearchRequest(req);
  const esQueryConfig = await getEsQueryConfig(req);
  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const bodiesPromises = getActiveSeries(panel).map(series =>
      getSeriesRequestParams(req, panel, series, esQueryConfig, capabilities)
    );

    const searches = (await Promise.all(bodiesPromises)).reduce(
      (acc, items) => acc.concat(items),
      []
    );

    const data = await searchRequest.search(searches);
    const series = data.map(handleResponseBody(panel));
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
