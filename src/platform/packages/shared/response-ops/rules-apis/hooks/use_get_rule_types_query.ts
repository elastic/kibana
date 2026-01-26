/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { QueryClient, UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import { getRuleTypes } from '../apis/get_rule_types';
import { queryKeys } from '../query_keys';

export interface GetRuleTypesQueryParams {
  http: HttpStart;
}

export const getKey = queryKeys.getRuleTypes;

export const useGetRuleTypesQuery = (
  { http }: GetRuleTypesQueryParams,
  {
    enabled,
    meta,
    queryClient,
  }: Pick<UseQueryOptions<RuleType[]>, 'enabled' | 'meta'> & {
    queryClient?: QueryClient;
  }
) => {
  const alertingQueryClient = useResponseOpsQueryClient();
  return useQuery(
    {
      queryKey: getKey(),
      queryFn: () => getRuleTypes({ http }),
      refetchOnWindowFocus: false,
      // Leveraging TanStack Query's caching system to avoid duplicated requests as
      // other state-sharing solutions turned out to be overly complex and less readable
      staleTime: 60 * 1000,
      enabled,
      meta,
    },
    queryClient ?? alertingQueryClient
  );
};
