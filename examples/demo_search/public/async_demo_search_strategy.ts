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
import {
  ISearchContext,
  TSearchStrategyProvider,
  ISearchStrategy,
} from '../../../src/plugins/data/public';

import { ASYNC_DEMO_SEARCH_STRATEGY, IAsyncDemoResponse } from '../common';
import { ASYNC_SEARCH_STRATEGY } from '../../../x-pack/plugins/data_enhanced/public';

/**
 * This demo search strategy provider simply provides a shortcut for calling the DEMO_ASYNC_SEARCH_STRATEGY
 * on the server side, without users having to pass it in explicitly, and it takes advantage of the
 * already registered ASYNC_SEARCH_STRATEGY that exists on the client.
 *
 * so instead of callers having to do:
 *
 * ```
 * search(
 *   { ...request, serverStrategy: DEMO_ASYNC_SEARCH_STRATEGY },
 *   options,
 *   ASYNC_SEARCH_STRATEGY
 *  ) as Observable<IDemoResponse>,
 *```

 * They can instead just do
 *
 * ```
 * search(request, options, DEMO_ASYNC_SEARCH_STRATEGY);
 * ```
 *
 * and are ensured type safety in regard to the request and response objects.
 *
 * @param context - context supplied by other plugins.
 * @param search - a search function to access other strategies that have already been registered.
 */
export const asyncDemoClientSearchStrategyProvider: TSearchStrategyProvider<typeof ASYNC_DEMO_SEARCH_STRATEGY> = (
  context: ISearchContext
): ISearchStrategy<typeof ASYNC_DEMO_SEARCH_STRATEGY> => {
  const asyncStrategyProvider = context.getSearchStrategy(ASYNC_SEARCH_STRATEGY);
  const { search } = asyncStrategyProvider(context);
  return {
    search: (request, options) => {
      return search(
        { ...request, serverStrategy: ASYNC_DEMO_SEARCH_STRATEGY },
        options
      ) as Observable<IAsyncDemoResponse>;
    },
  };
};
