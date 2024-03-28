/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../services/discover_state';

/**
 * Params for the hook
 */
export interface UseFetchMoreRecordsParams {
  isTextBasedQuery: boolean;
  stateContainer: DiscoverStateContainer;
}

/**
 * Return type for the hook
 */
export interface UseFetchMoreRecordsResult {
  isMoreDataLoading: boolean;
  totalHits: number;
  onFetchMoreRecords: (() => void) | undefined;
}

/**
 * Checks if more records can be loaded and returns a handler for it
 * @param isTextBasedQuery
 * @param stateContainer
 */
export const useFetchMoreRecords = ({
  isTextBasedQuery,
  stateContainer,
}: UseFetchMoreRecordsParams): UseFetchMoreRecordsResult => {
  const documents$ = stateContainer.dataState.data$.documents$;
  const totalHits$ = stateContainer.dataState.data$.totalHits$;
  const documentState = useObservable(documents$);
  const totalHitsState = useObservable(totalHits$);

  const rows = documentState?.result || [];
  const isMoreDataLoading = documentState?.fetchStatus === FetchStatus.LOADING_MORE;

  const totalHits = totalHitsState?.result || 0;
  const canFetchMoreRecords =
    !isTextBasedQuery &&
    rows.length > 0 &&
    totalHits > rows.length &&
    Boolean(rows[rows.length - 1].raw.sort?.length);

  const onFetchMoreRecords = useMemo(
    () =>
      canFetchMoreRecords
        ? () => {
            stateContainer.dataState.fetchMore();
          }
        : undefined,
    [canFetchMoreRecords, stateContainer.dataState]
  );

  return {
    isMoreDataLoading,
    totalHits,
    onFetchMoreRecords,
  };
};
