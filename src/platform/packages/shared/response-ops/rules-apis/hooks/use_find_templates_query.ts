/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useInfiniteQuery } from '@kbn/react-query';
import type { SetOptional } from 'type-fest';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import type {
  FindRuleTemplatesParams,
  FindRuleTemplatesResponse,
} from '../apis/find_rule_templates';
import { findRuleTemplates } from '../apis/find_rule_templates';

export interface UseFindTemplatesQueryParams extends SetOptional<FindRuleTemplatesParams, 'page'> {
  enabled?: boolean;
  refresh?: Date;
}

export const getKey = (
  params: Omit<UseFindTemplatesQueryParams, 'http' | 'toasts' | 'enabled'>
) => ['ruleTemplates', params];

export const useFindTemplatesQuery = ({
  http,
  enabled,
  refresh,
  page = 1,
  perPage,
  sortField,
  sortOrder,
  search,
  defaultSearchOperator,
  ruleTypeId,
  tags,
}: UseFindTemplatesQueryParams) => {
  const queryFn = async ({
    pageParam,
  }: {
    pageParam?: Pick<FindRuleTemplatesParams, 'page' | 'perPage'>;
  }) => {
    return findRuleTemplates({
      http,
      page: pageParam?.page ?? page,
      perPage: pageParam?.perPage ?? perPage,
      sortField,
      sortOrder,
      search,
      defaultSearchOperator,
      ruleTypeId,
      tags,
    });
  };

  const getNextPageParam = (lastPage: FindRuleTemplatesResponse) => {
    const loadedCount = lastPage.page * lastPage.perPage;
    if (loadedCount >= lastPage.total) {
      return undefined;
    }
    return {
      perPage: lastPage.perPage,
      page: lastPage.page + 1,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: getKey({
      search,
      perPage,
      sortField,
      sortOrder,
      refresh,
      page,
      defaultSearchOperator,
      ruleTypeId,
      tags,
    }),
    queryFn,
    getNextPageParam,
    initialPageParam: {
      page,
      perPage,
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    meta: {
      getErrorToast: (error: Error) => ({
        type: 'danger',
        title: i18n.translate('responseOpsRulesApis.unableToLoadTemplates', {
          defaultMessage: 'Unable to load rule templates',
        }),
        text: error.message,
      }),
    } satisfies ResponseOpsQueryMeta,
  });

  const templates = useMemo(() => {
    return data?.pages.flatMap((it) => it.data) ?? [];
  }, [data]);

  return {
    templates,
    totalTemplates: data?.pages[0]?.total ?? 0,
    hasNextPage,
    refetch,
    fetchNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
  };
};
