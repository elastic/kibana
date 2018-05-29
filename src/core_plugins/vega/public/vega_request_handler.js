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

import { VegaParser } from './data_model/vega_parser';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { SearchCache } from './data_model/search_cache';
import { TimeCache } from './data_model/time_cache';

export function VegaRequestHandlerProvider(Private, es, timefilter, serviceSettings) {

  const dashboardContext = Private(dashboardContextProvider);
  const searchCache = new SearchCache(es, { max: 10, maxAge: 4 * 1000 });
  const timeCache = new TimeCache(timefilter, 3 * 1000);

  return {

    name: 'vega',

    handler(vis, { timeRange }) {
      timeCache.setTimeRange(timeRange);
      const vp = new VegaParser(vis.params.spec, searchCache, timeCache, dashboardContext, serviceSettings);
      return vp.parseAsync();
    }

  };
}
