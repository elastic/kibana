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

// Creates a filter from a saved query.
// The entire saved query is passed in as params.savedQuery
// We also need the esQueryConfig that we have to pass in too as follows.
/*
import chrome from 'ui/chrome';
const config = chrome.getUiSettingsClient();
const esQueryConfigs = getEsQueryConfig(uiSettings);
*/

export function buildSavedQueryFilter(params, indexPattern) {
  const index = indexPattern.id;
  const type = 'savedQuery';
  const key = params.savedQuery.id; // the key is used for displaying on the filter pill,
  const value = params.savedQuery.attributes.title; // in this case, we'll end up with the same thing as the key and value
  const filter = {
    meta: { index, type, key, value, params }
  };
  const query = params.savedQuery.attributes.query;
  const filters = params.savedQuery.attributes.filters;
  const timeFilter = params.savedQuery.attributes.timefilter;
  /* convert the timefilter to an object of the form:
    I need to correct serializer function here
  {
    "range": {
      "timestamp": {
        "format": "strict_date_optional_time",
        "gte": timeFilter.from,
        "lte": timeFilter.to
      }
    }
  }
  The timeFilter has the following shape:
  {
    from: "now-7d"
    refreshInterval:
      pause: true
      value: 0
    to: "now"
  }
  That needs to be parsed!
  */
  const convertedTimeFilter = {
    range: {
      timestamp: {
        format: 'strict_date_optional_time',
        gte: timeFilter.from,
        lte: timeFilter.to
      }
    }
  };
  const esQueryConfig = params.esQueryConfig;
  const convertedQuery = buildEsQuery(index, query, filters, esQueryConfig);
  filter.query = { convertedQuery, convertedTimeFilter };
  return filter;
}
