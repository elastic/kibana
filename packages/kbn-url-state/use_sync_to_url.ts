/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect } from 'react';
import { encode, decode } from '@kbn/rison';

// https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event
const POPSTATE_EVENT = 'popstate' as const;

/**
 * Sync any object with browser query string using @knb/rison
 *  @param key query string param to use
 *  @param restore use this to handle restored state
 *  @param cleanupOnHistoryNavigation use history events to cleanup state on back / forward naviation. true by default
 */
export const useSyncToUrl = <TValueToSerialize>(
  key: string,
  restore: (data: TValueToSerialize) => void,
  cleanupOnHistoryNavigation = true
) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get(key);

    if (!param) {
      return;
    }

    const decodedQuery = decode(param);

    if (!decodedQuery) {
      return;
    }

    // Only restore the value if it is not falsy
    restore(decodedQuery as unknown as TValueToSerialize);
  }, [key, restore]);

  /**
   * Synces value with the url state, under specified key. If payload is undefined, the value will be removed from the query string althogether.
   */
  const syncValueToQueryString = useCallback(
    (valueToSerialize?: TValueToSerialize) => {
      const searchParams = new URLSearchParams(window.location.search);

      if (valueToSerialize) {
        const serializedPayload = encode(valueToSerialize);
        searchParams.set(key, serializedPayload);
      } else {
        searchParams.delete(key);
      }

      const newSearch = searchParams.toString();

      // Update query string without unnecessary re-render
      const newUrl = `${window.location.pathname}?${newSearch}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    },
    [key]
  );

  // Clear remove state from the url on unmount / when history back or forward is pressed
  useEffect(() => {
    const clearState = () => {
      syncValueToQueryString(undefined);
    };

    if (cleanupOnHistoryNavigation) {
      window.addEventListener(POPSTATE_EVENT, clearState);
    }

    return () => {
      clearState();

      if (cleanupOnHistoryNavigation) {
        window.removeEventListener(POPSTATE_EVENT, clearState);
      }
    };
  }, [cleanupOnHistoryNavigation, syncValueToQueryString]);

  return syncValueToQueryString;
};
