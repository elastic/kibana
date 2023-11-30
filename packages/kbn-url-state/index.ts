/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import { encode, decode, RisonValue } from '@kbn/rison';
import { stringify, parse } from 'query-string';

interface StateCache<T> {
  namespaces: Record<string, Record<string, T | undefined>>;
  timeoutHandle: number;
}

/**
 * Temporary cache for state stored in the URL. This will be serialized to the URL
 * in a single batched update to avoid excessive history entries.
 */
const cache: StateCache<unknown> = {
  namespaces: {},
  timeoutHandle: 0,
};

const CUSTOM_URL_EVENT = 'url:update' as const;

// This is a list of events that can trigger a render.
const URL_CHANGE_EVENTS: string[] = ['popstate', CUSTOM_URL_EVENT];

/**
 * This hook stores state in the URL, but with a namespace to avoid collisions with other values in the URL.
 * It also batches updates to the URL to avoid excessive history entries.
 * With it, you can store state in the URL and have it persist across page refreshes.
 * The state is stored in the URL as a Rison encoded object.
 *
 * Example: when called like this `const [value, setValue] = useUrlState<boolean>('myNamespace', 'myKey');`
 * the state will be stored in the URL like this: `?myNamespace=(myKey:!n)`
 *
 * State is not cleared from the URL when the hook is unmounted and this is by design.
 * If you want it to be cleared, you can do it manually by calling `setValue(undefined)`.
 *
 * @param urlNamespace actual top level query param key
 * @param key sub key of the query param
 */
export const useUrlState = <T = unknown>(urlNamespace: string, key: string) => {
  if (!cache.namespaces[urlNamespace]) {
    cache.namespaces[urlNamespace] = {};
  }

  const [internalValue, setInternalValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    // This listener is called on browser navigation or on custom event.
    // It updates the LOCAL state, allowing dependent components to re-render.
    const listener = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const param = searchParams.get(urlNamespace);

      const decodedState = param ? decode(param) : ({} as Record<string, RisonValue>);
      const decodedValue = (decodedState as Record<string, RisonValue> | undefined)?.[key];
      cache.namespaces[urlNamespace][key] = decodedValue;
      setInternalValue(decodedValue as unknown as T);
    };

    listener();

    URL_CHANGE_EVENTS.forEach((event) => window.addEventListener(event, listener));

    return () => URL_CHANGE_EVENTS.forEach((event) => window.removeEventListener(event, listener));
  }, [key, urlNamespace]);

  const setValue = useCallback(
    (updatedValue: T | undefined) => {
      const currentValue = cache.namespaces[urlNamespace][key];

      const canSpread =
        typeof updatedValue === 'object' &&
        typeof currentValue === 'object' &&
        !Array.isArray(updatedValue) &&
        !Array.isArray(currentValue);

      cache.namespaces[urlNamespace][key] = canSpread
        ? ({ ...currentValue, ...updatedValue } as unknown as T)
        : (updatedValue as unknown as T);

      // This batches updates to the URL state to avoid excessive history entries
      if (cache.timeoutHandle) {
        window.clearTimeout(cache.timeoutHandle);
      }

      // The push state call is delayed to make sure that multiple calls to setValue
      // within a short period of time are batched together.
      cache.timeoutHandle = window.setTimeout(() => {
        const searchParams = parse(location.search);

        for (const ns in cache.namespaces) {
          if (!Object.prototype.hasOwnProperty.call(cache.namespaces, ns)) {
            continue;
          }
          searchParams[ns] = encode(cache.namespaces[ns]);
        }

        const newSearch = stringify(searchParams, { encode: false });

        if (window.location.search === newSearch) {
          return;
        }

        const newUrl = `${window.location.hash}?${newSearch}`;

        window.history.pushState({}, '', newUrl);
        // This custom event is used to notify other instances
        // of this hook that the URL has changed.
        window.dispatchEvent(new Event(CUSTOM_URL_EVENT));
      }, 0);
    },
    [key, urlNamespace]
  );

  return [internalValue, setValue] as const;
};
