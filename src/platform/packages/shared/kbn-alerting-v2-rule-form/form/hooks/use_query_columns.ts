/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useRef } from 'react';
import type { ISearchGeneric } from '@kbn/search-types';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';

export interface QueryColumn {
  name: string;
  type: string;
}

interface UseQueryColumnsProps {
  query: string;
  search: ISearchGeneric;
}

export const useQueryColumns = ({ query, search }: UseQueryColumnsProps) => {
  const [columns, setColumns] = useState<QueryColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchColumns = async () => {
      if (!query) {
        setColumns([]);
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const rawColumns = await getESQLQueryColumnsRaw({
          esqlQuery: query,
          search,
          signal: abortControllerRef.current.signal,
          dropNullColumns: true,
        });

        setColumns(
          rawColumns.map(({ name, type }) => ({
            name,
            type,
          }))
        );
      } catch (e: unknown) {
        // Ignore abort errors
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        setError(e instanceof Error ? e : new Error('Unknown error'));
        setColumns([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColumns();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, search]);

  return { columns, isLoading, error };
};
