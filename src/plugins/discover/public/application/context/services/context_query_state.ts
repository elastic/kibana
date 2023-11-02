/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';

export interface ContextFetchState {
  /**
   * Documents listed before anchor
   */
  predecessors: DataTableRecord[];
  /**
   * Documents after anchor
   */
  successors: DataTableRecord[];
  /**
   * Anchor document
   */
  anchor: DataTableRecord;
  /**
   * Anchor fetch status
   */
  anchorStatus: LoadingStatusEntry;
  /**
   * Predecessors fetch status
   */
  predecessorsStatus: LoadingStatusEntry;
  /**
   * Successors fetch status
   */
  successorsStatus: LoadingStatusEntry;

  /**
   * Intercepted warnings for anchor request
   */
  anchorInterceptedWarnings: SearchResponseWarning[] | undefined;

  /**
   * Intercepted warnings for predecessors request
   */
  predecessorsInterceptedWarnings: SearchResponseWarning[] | undefined;

  /**
   * Intercepted warnings for successors request
   */
  successorsInterceptedWarnings: SearchResponseWarning[] | undefined;
}

export enum LoadingStatus {
  FAILED = 'failed',
  LOADED = 'loaded',
  LOADING = 'loading',
  UNINITIALIZED = 'uninitialized',
}

export enum FailureReason {
  UNKNOWN = 'unknown',
  INVALID_TIEBREAKER = 'invalid_tiebreaker',
}

export interface LoadingStatusEntry {
  value: LoadingStatus;
  error?: Error;
  reason?: FailureReason;
}

export const getInitialContextQueryState = (): ContextFetchState => ({
  anchor: {} as DataTableRecord,
  predecessors: [],
  successors: [],
  anchorStatus: { value: LoadingStatus.UNINITIALIZED },
  predecessorsStatus: { value: LoadingStatus.UNINITIALIZED },
  successorsStatus: { value: LoadingStatus.UNINITIALIZED },
  anchorInterceptedWarnings: undefined,
  predecessorsInterceptedWarnings: undefined,
  successorsInterceptedWarnings: undefined,
});
