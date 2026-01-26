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
import type { GetRuleTagsParams, GetRuleTagsResponse } from '../apis/get_rule_tags';
import { getRuleTags } from '../apis/get_rule_tags';
import { queryKeys } from '../query_keys';

interface UseGetRuleTagsQueryParams extends SetOptional<GetRuleTagsParams, 'page'> {
  // Params
  refresh?: Date;
  enabled: boolean;
}

const EMPTY_TAGS: string[] = [];

type PageParam = Pick<GetRuleTagsParams, 'page' | 'perPage'>;

export const getKey = queryKeys.getRuleTags;

// React query will refetch all prev pages when the cache keys change:
// https://github.com/TanStack/query/discussions/3576
export function useGetRuleTagsQuery({
  enabled,
  refresh,
  search,
  ruleTypeIds,
  page = 1,
  perPage = 50,
  http,
}: UseGetRuleTagsQueryParams) {
  const queryFn = ({ pageParam }: { pageParam?: PageParam }) =>
    getRuleTags({
      http,
      perPage: pageParam?.perPage ?? perPage,
      page: pageParam?.page ?? page,
      search,
      ruleTypeIds,
    });

  const getNextPageParam = (lastPage: GetRuleTagsResponse): PageParam | undefined => {
    const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.perPage));
    if (totalPages === lastPage.page) {
      return;
    }
    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  };

  const {
    refetch,
    data,
    fetchNextPage,
    isLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: getKey({
      ruleTypeIds,
      search,
      perPage,
      page,
      refresh,
    }),
    queryFn,
    enabled,
    initialPageParam: { page, perPage },
    getNextPageParam,
    refetchOnWindowFocus: false,
    meta: {
      getErrorToast: () => ({
        type: 'danger',
        title: i18n.translate('responseOpsRulesApis.unableToLoadRuleTags', {
          defaultMessage: 'Unable to load rule tags',
        }),
      }),
    } satisfies ResponseOpsQueryMeta,
  });

  const tags = useMemo(() => {
    return (
      data?.pages.reduce<string[]>((result, current) => {
        return result.concat(current.data);
      }, []) || EMPTY_TAGS
    );
  }, [data]);

  return {
    tags,
    hasNextPage,
    refetch,
    isLoading: isLoading || isFetching || isFetchingNextPage,
    fetchNextPage,
    isError,
  };
}
