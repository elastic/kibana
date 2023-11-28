/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { REACT_QUERY_KEYS } from '../constants';
import { useAppContext } from '../context/app_context';

export interface UseGetAiConnectorsResponse {
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  connectors: FindActionResult[] | undefined;
}

export function useGetAiConnectors(): UseGetAiConnectorsResponse {
  const { observabilityAIAssistant } = useAppContext();

  const observabilityAIAssistantApi = observabilityAIAssistant?.callApi;

  const {
    isLoading,
    isError,
    isSuccess,
    isRefetching,
    data: connectors,
  } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_GENAI_CONNECTORS],
    queryFn: async ({ signal }) => {
      if (!observabilityAIAssistantApi || !signal) {
        return Promise.reject('Error with observabilityAIAssistantApi: API not found.');
      }

      return observabilityAIAssistantApi?.(`GET /internal/observability_ai_assistant/connectors`, {
        signal,
      });
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    connectors,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
