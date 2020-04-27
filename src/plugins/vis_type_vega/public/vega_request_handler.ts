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

import { Filter, esQuery, TimeRange, Query } from '../../data/public';

// @ts-ignore
import { VegaParser } from './data_model/vega_parser';
// @ts-ignore
import { SearchCache } from './data_model/search_cache';
// @ts-ignore
import { TimeCache } from './data_model/time_cache';

import { VegaVisualizationDependencies } from './plugin';
import { VisParams } from './vega_fn';
import { getData } from './services';

interface VegaRequestHandlerParams {
  query: Query;
  filters: Filter;
  timeRange: TimeRange;
  visParams: VisParams;
}

export function createVegaRequestHandler({
  plugins: { data },
  core: { uiSettings },
  serviceSettings,
}: VegaVisualizationDependencies) {
  let searchCache: SearchCache | undefined;
  const { timefilter } = data.query.timefilter;
  const timeCache = new TimeCache(timefilter, 3 * 1000);

  return ({ timeRange, filters, query, visParams }: VegaRequestHandlerParams) => {
    if (!searchCache) {
      searchCache = new SearchCache(getData().search.__LEGACY.esClient, {
        max: 10,
        maxAge: 4 * 1000,
      });
    }

    timeCache.setTimeRange(timeRange);

    const esQueryConfigs = esQuery.getEsQueryConfig(uiSettings);
    const filtersDsl = esQuery.buildEsQuery(undefined, query, filters, esQueryConfigs);
    const vp = new VegaParser(visParams.spec, searchCache, timeCache, filtersDsl, serviceSettings);

    return vp.parseAsync();
  };
}
