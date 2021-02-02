/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
