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

import { APICaller } from 'kibana/server';
import { IRouteHandlerSearchContext } from './i_route_handler_search_context';
import { DEFAULT_SEARCH_STRATEGY } from '../../common/search';
import { TSearchStrategiesMap } from './i_search_strategy';

export function createApi({
  caller,
  searchStrategies,
}: {
  searchStrategies: TSearchStrategiesMap;
  caller: APICaller;
}) {
  const api: IRouteHandlerSearchContext = {
    search: async (request, options, strategyName) => {
      console.log('createApi: searching..., strategys is ', searchStrategies);
      const name = strategyName ? strategyName : DEFAULT_SEARCH_STRATEGY;
      console.log('createApi: name is ', name);
      const strategyProvider = searchStrategies[name];
      if (!strategyProvider) {
        console.log('no provider found');
        throw new Error(`No strategy found for ${strategyName}`);
      }
      console.log('createApi: searching with request ', request);
      console.log('createApi: searching with startegy name ', strategyName);
      console.log('createApi: searching with startegy provider ', strategyProvider);
      // Give providers access to other search strategies by injecting this function
      const strategy = await strategyProvider(caller, api.search);
      return strategy.search(request, options);
    },
  };
  return api;
}
