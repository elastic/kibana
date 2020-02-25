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

import { Observable } from 'rxjs';
import { ISearchContext, SYNC_SEARCH_STRATEGY } from '../../../src/plugins/data/public';
import { TSearchStrategyProvider, ISearchStrategy } from '../../../src/plugins/data/public';

import { DEMO_SEARCH_STRATEGY, IDemoResponse } from '../common';

/**
 * This demo search strategy provider simply provides a shortcut for calling the DEMO_SEARCH_STRATEGY
 * on the server side, without users having to pass it in explicitly, and it takes advantage of the
 * already registered SYNC_SEARCH_STRATEGY that exists on the client.
 *
 * so instead of callers having to do:
 *
 * ```
 * context.search(
 *   { ...request, serverStrategy: DEMO_SEARCH_STRATEGY },
 *   options,
 *   SYNC_SEARCH_STRATEGY
 *  ) as Observable<IDemoResponse>,
 *```

 * They can instead just do
 *
 * ```
 * context.search(request, options, DEMO_SEARCH_STRATEGY);
 * ```
 * 
 * and are ensured type safety in regard to the request and response objects.
 *
 * @param context - context supplied by other plugins.
 * @param search - a search function to access other strategies that have already been registered.
 */
export const demoClientSearchStrategyProvider: TSearchStrategyProvider<typeof DEMO_SEARCH_STRATEGY> = (
  context: ISearchContext
): ISearchStrategy<typeof DEMO_SEARCH_STRATEGY> => {
  const syncStrategyProvider = context.getSearchStrategy(SYNC_SEARCH_STRATEGY);
  const { search } = syncStrategyProvider(context);
  return {
    search: (request, options) => {
      return search({ ...request, serverStrategy: DEMO_SEARCH_STRATEGY }, options) as Observable<
        IDemoResponse
      >;
    },
  };
};
