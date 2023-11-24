/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useAppContext } from '../context/app_context';
import { KnowledgeBaseEntry } from '../../common/types';

export interface UseGetKnowledgeBaseEntriesResponse {
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  entries: KnowledgeBaseEntry[] | undefined;
}

export function useGetKnowledgeBaseEntries(query: string): UseGetKnowledgeBaseEntriesResponse {
  const { http } = useAppContext();

  const { isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES, query],
    queryFn: async ({ signal }) => {
      const response = await http.get<{ entries: KnowledgeBaseEntry[] }>(
        `/internal/management/ai_assistant/observability/kb/entries`,
        {
          query: query
            ? {
                query,
              }
            : {},
          signal,
        }
      );
      return response;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    entries: data?.entries,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
