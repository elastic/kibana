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
import { buildRequestBody } from './table/build_request_body';
import { handleErrorResponse } from './handle_error_response';
import { get } from 'lodash';
import { processBucket } from './table/process_bucket';
import { SearchStrategiesRegister } from '../search_strategies/search_strategies_register';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getIndexPatternObject } from './helpers/get_index_pattern';

export async function getTableData(req, panel) {
  const panelIndexPattern = panel.index_pattern;
  const { searchStrategy, capabilities } = await SearchStrategiesRegister.getViableStrategy(
    req,
    panelIndexPattern
  );
  const searchRequest = searchStrategy.getSearchRequest(req);
  const esQueryConfig = await getEsQueryConfig(req);
  const { indexPatternObject } = await getIndexPatternObject(req, panelIndexPattern);

  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const body = buildRequestBody(req, panel, esQueryConfig, indexPatternObject, capabilities);
    const [resp] = await searchRequest.search([
      {
        body,
        index: panelIndexPattern,
      },
    ]);
    const buckets = get(resp, 'aggregations.pivot.buckets', []);

    return {
      ...meta,
      series: buckets.map(processBucket(panel)),
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
