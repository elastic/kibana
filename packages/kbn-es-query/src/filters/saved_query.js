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
import { get } from 'lodash';
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
  const filter = {
    meta: {
      index: indexPattern.id,
      type: 'savedQuery',
      key: params.savedQuery.id,
      value: params.savedQuery.attributes.title,
      params,
    }
  };

  const query = get(params, 'savedQuery.attributes.query');
  const filters = get(params, 'savedQuery.attributes.filters', []);
  const esQueryConfig = get(params, 'esQueryConfig', { allowLeadingWildcards: true, queryStringOptions: {}, dateFormatTZ: null });
  const convertedQuery = buildEsQuery(indexPattern, query, filters, esQueryConfig);
  filter.query = { ...convertedQuery };

  // timefilter addition
  // TODO: should we also handle the refresh interval part of the timefilter?
  const convertedTimeFilter = get(params, 'savedQuery.attributes.timefilter', null); // should already be an EsQuery
  if (convertedTimeFilter) {
    const filtersWithTimefilter = [...convertedQuery.bool.filter, convertedTimeFilter];
    filter.query.bool.filter = [...filtersWithTimefilter];
  }
  return filter;
}
