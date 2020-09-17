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

import { getPreference } from '../fetch';
import { SearchStrategyProvider, SearchStrategySearchParams } from './types';

// @deprecated
export const defaultSearchStrategy: SearchStrategyProvider = {
  id: 'default',

  search: (params) => {
    return msearch(params);
  },
};

function msearch({ searchRequests, getConfig, legacy }: SearchStrategySearchParams) {
  const { callMsearch, loadingCount$ } = legacy;

  const requests = searchRequests.map(({ index, body }) => {
    return {
      header: {
        index: index.title || index,
        preference: getPreference(getConfig),
      },
      body,
    };
  });

  const abortController = new AbortController();
  let resolved = false;

  // Start LoadingIndicator
  loadingCount$.next(loadingCount$.getValue() + 1);

  const cleanup = () => {
    if (!resolved) {
      resolved = true;
      // Decrement loading counter & cleanup BehaviorSubject
      loadingCount$.next(loadingCount$.getValue() - 1);
      loadingCount$.complete();
    }
  };

  const searching = callMsearch({
    body: { searches: requests },
    signal: abortController.signal,
  })
    .then((res: any) => res?.body?.responses)
    .finally(() => cleanup());

  return {
    abort: () => {
      abortController.abort();
      cleanup();
    },
    searching,
  };
}
