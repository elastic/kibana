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
import getRequestParams from './series/get_request_params';
import handleResponseBody from './series/handle_response_body';
import handleErrorResponse from './handle_error_response';
import getAnnotations from './get_annotations';
import SearchStrategiesRegister from '../search_strategies/search_strategies_register';

export async function getSeriesData(req, panel) {
  const indexPattern = panel.index_pattern;
  const searchStrategy = SearchStrategiesRegister.getViableStrategy(req, indexPattern);
  const searchRequest = searchStrategy.getSearchRequest(req, indexPattern);
  const esQueryConfig = await getEsQueryConfig(req);

  const body = panel.series
    .map(series => getRequestParams(req, panel, series, searchStrategy.batchRequestsSupport))
    .reduce((acc, items) => acc.concat(items), []);

  return searchRequest.search({ body })
    .then(data => {
      const series = data.map(handleResponseBody(panel, esQueryConfig));
      return {
        [panel.id]: {
          id: panel.id,
          series: series.reduce((acc, series) => acc.concat(series), []),
        },
      };
    })
    .then(resp => {
      // TODO: don't forget to remove
      // Should be refactored
      return resp;
      if (!panel.annotations || panel.annotations.length === 0) return resp;
      return getAnnotations(req, panel, esQueryConfig).then(annotations => {
        resp[panel.id].annotations = annotations;
        return resp;
      });
    })
    .then(resp => {
      resp.type = panel.type;
      return resp;
    })
    .catch(handleErrorResponse(panel));
}

