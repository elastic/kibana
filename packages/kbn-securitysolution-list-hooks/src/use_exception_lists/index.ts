/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExceptionListSchema,
  UseExceptionListsProps,
  Pagination,
} from '@kbn/securitysolution-io-ts-list-types';
import { fetchExceptionLists } from '@kbn/securitysolution-list-api';

import { getFilters } from '@kbn/securitysolution-list-utils';

export type Func = () => void;
export type ReturnExceptionLists = [
  loading: boolean,
  exceptionLists: ExceptionListSchema[],
  pagination: Pagination,
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>,
  fetchLists: Func | null
];

const DEFAULT_PAGINATION = {
  page: 1,
  perPage: 20,
  total: 0,
};

/**
 * Hook for fetching ExceptionLists
 *
 * @param http Kibana http service
 * @param errorMessage message shown to user if error occurs
 * @param filterOptions filter by certain fields
 * @param namespaceTypes spaces to be searched
 * @param notifications kibana service for displaying toasters
 * @param showTrustedApps boolean - include/exclude trusted app lists
 * @param showEventFilters boolean - include/exclude event filters lists
 * @param showHostIsolationExceptions boolean - include/exclude host isolation exceptions lists
 * @param initialPagination
 *
 */
export const useExceptionLists = ({
  errorMessage,
  http,
  initialPagination = DEFAULT_PAGINATION,
  filterOptions = {},
  namespaceTypes,
  notifications,
  showTrustedApps = false,
  showEventFilters = false,
  showHostIsolationExceptions = false,
}: UseExceptionListsProps): ReturnExceptionLists => {
  const [exceptionLists, setExceptionLists] = useState<ExceptionListSchema[]>([]);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(true);
  const abortCtrlRef = useRef<AbortController>();

  const namespaceTypesAsString = useMemo(() => namespaceTypes.join(','), [namespaceTypes]);
  const filters = useMemo(
    (): string =>
      getFilters({
        filters: filterOptions,
        namespaceTypes,
        showTrustedApps,
        showEventFilters,
        showHostIsolationExceptions,
      }),
    [namespaceTypes, filterOptions, showTrustedApps, showEventFilters, showHostIsolationExceptions]
  );

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      abortCtrlRef.current = new AbortController();

      const {
        page,
        per_page: perPage,
        total,
        data,
      } = await fetchExceptionLists({
        filters,
        http,
        namespaceTypes: namespaceTypesAsString,
        pagination: {
          page: pagination.page,
          perPage: pagination.perPage,
        },
        signal: abortCtrlRef.current.signal,
      });

      setPagination({
        page,
        perPage,
        total,
      });
      setExceptionLists(data);
      setLoading(false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        notifications.toasts.addError(error, {
          title: errorMessage,
        });
        setExceptionLists([]);
        setPagination(DEFAULT_PAGINATION);
        setLoading(false);
      }
    }
  }, [
    errorMessage,
    filters,
    http,
    namespaceTypesAsString,
    notifications.toasts,
    pagination.page,
    pagination.perPage,
  ]);

  useEffect(() => {
    fetchData();

    return (): void => {
      abortCtrlRef.current?.abort();
    };
  }, [fetchData]);

  return [loading, exceptionLists, pagination, setPagination, fetchData];
};
