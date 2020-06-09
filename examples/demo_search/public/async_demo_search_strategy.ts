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

import { Observable, from } from 'rxjs';
import { CoreSetup } from 'kibana/public';
import { flatMap } from 'rxjs/operators';
import { ISearch } from '../../../src/plugins/data/public';
import { ASYNC_SEARCH_STRATEGY } from '../../../x-pack/plugins/data_enhanced/public';
import { ASYNC_DEMO_SEARCH_STRATEGY, IAsyncDemoResponse } from '../common';
import { DemoDataSearchStartDependencies } from './types';

export function asyncDemoClientSearchStrategyProvider(core: CoreSetup) {
  const search: ISearch<typeof ASYNC_DEMO_SEARCH_STRATEGY> = (request, options) => {
    return from(core.getStartServices()).pipe(
      flatMap((startServices) => {
        const asyncStrategy = (startServices[1] as DemoDataSearchStartDependencies).data.search.getSearchStrategy(
          ASYNC_SEARCH_STRATEGY
        );
        return asyncStrategy.search(
          { ...request, serverStrategy: ASYNC_DEMO_SEARCH_STRATEGY },
          options
        ) as Observable<IAsyncDemoResponse>;
      })
    );
  };
  return { search };
}
