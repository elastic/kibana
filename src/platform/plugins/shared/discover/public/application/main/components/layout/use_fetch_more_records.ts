/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
import { FetchStatus } from '../../../types';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

/**
 * Params for the hook
 */
export interface UseFetchMoreRecordsParams {
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
 * @param stateContainer
 */
export const useFetchMoreRecords = ({
  stateContainer,
}: UseFetchMoreRecordsParams): UseFetchMoreRecordsResult => {
  const { documentState, totalHitsState } = useInternalStateSelector((state) => ({
    documentState: state.dataResults!,
    totalHitsState: state.dataTotalHits!,
  }));

  const isEsqlMode = useIsEsqlMode();

  const rows = documentState.result || [];
  const isMoreDataLoading = documentState.fetchStatus === FetchStatus.LOADING_MORE;

  const totalHits = totalHitsState.result || 0;
  const canFetchMoreRecords =
    !isEsqlMode &&
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
