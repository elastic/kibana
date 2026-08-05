/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

/**
 * Narrow init types needed by current Kibana consumers of `useSearchParams`.
 * This is intentionally not a full React Router v6 surface.
 */
export type URLSearchParamsInit =
  | string
  | URLSearchParams
  | Record<string, string | string[]>
  | Array<[string, string]>
  | undefined;

export type SetURLSearchParams = (
  nextInit:
    | URLSearchParamsInit
    | ((prev: URLSearchParams) => URLSearchParamsInit),
  navigateOpts?: { replace?: boolean }
) => void;

const createSearchParams = (init: URLSearchParamsInit = ''): URLSearchParams => {
  if (
    typeof init === 'string' ||
    Array.isArray(init) ||
    init instanceof URLSearchParams
  ) {
    return new URLSearchParams(init);
  }

  return new URLSearchParams(
    Object.keys(init).reduce<Array<[string, string]>>((memo, key) => {
      const value = init[key];
      if (Array.isArray(value)) {
        return memo.concat(value.map((entry) => [key, entry]));
      }
      return memo.concat([[key, value]]);
    }, [])
  );
};

const getSearchParamsForLocation = (
  locationSearch: string,
  defaultSearchParams: URLSearchParams | null
): URLSearchParams => {
  const searchParams = createSearchParams(locationSearch);

  if (defaultSearchParams) {
    defaultSearchParams.forEach((_, key) => {
      if (!searchParams.has(key)) {
        defaultSearchParams.getAll(key).forEach((value) => {
          searchParams.append(key, value);
        });
      }
    });
  }

  return searchParams;
};

/**
 * v5-backed replacement for React Router's `useSearchParams`.
 *
 * Preserves the tuple shape, functional updates, push/replace behavior, and
 * URLSearchParams encoding expected by current Kibana consumers.
 */
export const useSearchParams = (
  defaultInit?: URLSearchParamsInit
): [URLSearchParams, SetURLSearchParams] => {
  const defaultSearchParamsRef = useRef(createSearchParams(defaultInit));
  const hasSetSearchParamsRef = useRef(false);
  const history = useHistory();
  const location = useLocation();

  const searchParams = useMemo(
    () =>
      getSearchParamsForLocation(
        location.search,
        hasSetSearchParamsRef.current ? null : defaultSearchParamsRef.current
      ),
    [location.search]
  );

  const setSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOpts) => {
      const newSearchParams = createSearchParams(
        typeof nextInit === 'function' ? nextInit(searchParams) : nextInit
      );
      hasSetSearchParamsRef.current = true;

      const nextLocation = {
        search: newSearchParams.toString(),
      };

      if (navigateOpts?.replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history, searchParams]
  );

  return [searchParams, setSearchParams];
};
