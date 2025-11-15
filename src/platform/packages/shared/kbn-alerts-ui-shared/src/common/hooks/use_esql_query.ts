/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import type { FetchEsqlQueryParams } from '../apis/fetch_esql_query';
import { fetchEsqlQuery } from '../apis/fetch_esql_query';

export type UseEsqlQueryParams = FetchEsqlQueryParams;

// Query key prefix MUST contain explicit strings, not fetchEsqlQuery.name
// Production builds cannot guarantee a unique function name
const queryKeyPrefix = ['alerts', 'fetchEsqlQuery'];

/**
 * Execute an ES|QL query
 *
 * When testing components that depend on this hook, prefer mocking the {@link fetchEsqlQuery} function instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useEsqlQuery = (
  { data, ...params }: UseEsqlQueryParams,
  options?: Pick<
    QueryOptionsOverrides<typeof fetchEsqlQuery>,
    'placeholderData' | 'context' | 'onError' | 'refetchOnWindowFocus' | 'staleTime' | 'enabled'
  >
) => {
  const { query, filter } = params;

  return useQuery({
    queryKey: queryKeyPrefix.concat([query]),
    queryFn: () => fetchEsqlQuery({ data, query, filter }),
    refetchOnWindowFocus: false,
    ...options,
    enabled: query != null && query.length > 0 && (options?.enabled == null || options.enabled),
  });
};
