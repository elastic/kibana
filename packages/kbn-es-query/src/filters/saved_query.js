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
import { buildEsQuery } from '../es_query';

/* Creates a filter from a saved query.
  The saved query's time filter is already parsed
  params = { savedQueryWithTimefilterAsEsQuery, esQueryConfig }
  esQueryConfig obtained from chrome:
    ```
    import chrome from 'ui/chrome';
    const config = chrome.getUiSettingsClient();
    const esQueryConfigs = getEsQueryConfig(uiSettings);
    ```
  indexPattern has to be passed in too
*/


export function buildSavedQueryFilter(params, indexPattern) {
  // console.log('params:', params);
  // console.log('indexPattern:', indexPattern);
  const filter = {
    meta: {
      index: indexPattern.id,
      type: 'savedQuery',
      key: params.savedQuery.id,
      value: params.savedQuery.attributes.title,
      params,
    }
  };

  const query = params.savedQuery.attributes.query;
  const filters = params.savedQuery.attributes.filters;
  const convertedTimeFilter = params.savedQuery.attributes.timefilter ? params.savedQuery.attributes.timefilter : null; // should already be an EsQuery
  const esQueryConfig = params.esQueryConfig;
  const convertedQuery = buildEsQuery(indexPattern, query, filters, esQueryConfig);
  filter.query = { convertedQuery, convertedTimeFilter };
  return filter;
}
