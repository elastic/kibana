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
import { merge } from 'lodash';

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
  const [internalValue, setInternalValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    // This listener is called on browser navigation or on custom event.
    // It updates the LOCAL state, allowing dependent components to re-render.
    const listener = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const param = searchParams.get(urlNamespace);

      const decodedState = param ? decode(param) : ({} as Record<string, RisonValue>);
      const decodedValue = (decodedState as Record<string, RisonValue> | undefined)?.[key];
      setInternalValue(decodedValue as unknown as T);
    };

    listener();

    URL_CHANGE_EVENTS.forEach((event) => window.addEventListener(event, listener));

    return () => URL_CHANGE_EVENTS.forEach((event) => window.removeEventListener(event, listener));
  }, [key, urlNamespace]);

  const setValue = useCallback(
    (newValue: T | undefined) => {
      const queryParams = parse(location.search) as any;
      const currentNsValue = (
        queryParams?.[urlNamespace] ? decode(queryParams?.[urlNamespace]) : {}
      ) as any;

      const currentValue = currentNsValue?.[key];

      const canSpread =
        typeof newValue === 'object' &&
        typeof currentValue === 'object' &&
        !Array.isArray(newValue) &&
        !Array.isArray(currentValue);

      const upatedValueToStoreAtKey = canSpread
        ? (merge(currentValue, newValue) as unknown as T)
        : (newValue as unknown as T);

      if (upatedValueToStoreAtKey) {
        currentNsValue[key] = upatedValueToStoreAtKey;
      } else {
        delete currentNsValue[key];
      }

      queryParams[urlNamespace] = encodeURIComponent(encode(currentNsValue));

      // NOTE: don't re-encode the entire url params string
      const newSearch = stringify(queryParams, { encode: false });

      if (window.location.search === newSearch) {
        return;
      }

      const newUrl = `${window.location.hash}?${newSearch}`;

      window.history.pushState({}, '', newUrl);
      // This custom event is used to notify other instances
      // of this hook that the URL has changed.
      window.dispatchEvent(new Event(CUSTOM_URL_EVENT));
    },
    [key, urlNamespace]
  );

  return [internalValue, setValue] as const;
};
