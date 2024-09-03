/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';

export interface UseVirtualDataViewParams {
  // Dependencies
  dataViewsService: DataViewsContract;

  // Params
  /**
   * The index names to create the data view for
   */
  indexNames?: string[];
}

export const queryKeyPrefix = ['alerts', 'dataView'];

/**
 * Creates an in-memory data view, cached by index names
 *
 * When testing components that depend on this hook, prefer mocking {@link DataViewsContract}'s
 * create and clearInstanceCache method instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export const useVirtualDataViewQuery = (
  { dataViewsService, indexNames }: UseVirtualDataViewParams,
  options?: QueryOptionsOverrides<DataViewsContract['create']>
) => {
  const query = useQuery({
    queryKey: queryKeyPrefix.concat(indexNames ?? []),
    queryFn: () =>
      dataViewsService.create({
        title: (indexNames ?? []).join(','),
        allowNoIndex: true,
      }),
    enabled: !!indexNames?.length,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    ...options,
  });

  useEffect(() => {
    // Cleanup the data view instance cache on unmount
    if (query.data) {
      return () => {
        dataViewsService.clearInstanceCache(query.data.id);
      };
    }
  }, [dataViewsService, query.data]);

  return query;
};
