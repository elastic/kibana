/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import queryString from 'query-string';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';

export function useInRouterContext() {
  try {
    useLocation();
    return true;
  } catch (e: unknown) {
    return false;
  }
}

function useQuery<T extends Record<string, unknown> = {}>() {
  const { search } = useLocation();
  return useMemo<T>(() => queryString.parse(search) as T, [search]);
}

export function useUrlState<
  T extends Record<string, unknown> = {},
  Q extends Record<string, unknown> = {}
>({
  queryParamsDeserializer,
  queryParamsSerializer,
}: {
  queryParamsDeserializer: (params: Q) => T;
  queryParamsSerializer: (params: Record<string, unknown>) => Partial<Q>;
}): [T, (updated: Record<string, unknown>) => void] {
  const history = useHistory();
  const params = useQuery<Q>();
  const [urlState, setUrlState] = useState<T>({} as T);

  const updateQuerParams = useCallback(
    (updated: Record<string, unknown>) => {
      const updatedQuery = queryParamsSerializer(updated);

      const queryParams = {
        ...params,
        ...updatedQuery,
      };

      history.replace({
        search: `?${queryString.stringify(queryParams, { encode: false })}`,
      });
    },
    [history, params, queryParamsSerializer]
  );

  useEffect(() => {
    const updatedState = queryParamsDeserializer(params);
    setUrlState(updatedState);
  }, [params, queryParamsDeserializer]);

  return [urlState, updateQuerParams];
}
