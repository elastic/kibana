/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchAlertsIndexNames,
  FetchAlertsIndexNamesParams,
} from '../apis/fetch_alerts_index_names';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';

export type UseFetchAlertsIndexNamesQueryParams = FetchAlertsIndexNamesParams;

// Query key prefix MUST contain explicit strings, not fetchAlertsIndexNames.name
// Production builds cannot guarantee a unique function name
export const queryKeyPrefix = ['alerts', 'fetchAlertsIndexNames'];

/**
 * Fetch alerts index names feature ids
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchAlertsIndexNames} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useFetchAlertsIndexNamesQuery = (
  { http, ruleTypeIds }: UseFetchAlertsIndexNamesQueryParams,
  options?: Pick<
    QueryOptionsOverrides<typeof fetchAlertsIndexNames>,
    'context' | 'onError' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  >
) => {
  return useQuery({
    queryKey: queryKeyPrefix.concat(ruleTypeIds),
    queryFn: () => fetchAlertsIndexNames({ http, ruleTypeIds }),
    enabled: ruleTypeIds.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
