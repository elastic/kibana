/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export const useCombinedQueries = (...queries: UseQueryResult[]) => {
  const isLoading = queries.some((query) => query.isLoading);
  const isFetching = queries.some((query) => query.isFetching);
  const isError = queries.some((query) => query.isError);
  const isSuccess = queries.every((query) => query.isSuccess);
  const data = queries.map((query) => query.data);
  const refetch = useCallback(
    (options?: Parameters<UseQueryResult['refetch']>[0]) =>
      Promise.all(queries.map((query) => query.refetch(options))),
    [queries]
  );

  return useMemo(
    () => ({
      isLoading,
      isFetching,
      isError,
      isSuccess,
      data,
      refetch,
    }),
    [data, isError, isFetching, isLoading, isSuccess, refetch]
  );
};
