/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsHitRecord } from './context/api/context';
import { EsHitRecordList } from './context/api/context';

export interface ContextFetchState {
  /**
   * Documents listed before anchor
   */
  predecessors: EsHitRecordList;
  /**
   * Documents after anchor
   */
  successors: EsHitRecordList;
  /**
   * Anchor document
   */
  anchor: EsHitRecord;
  /**
   * Anchor fetch status
   */
  anchorStatus: LoadingState;
  /**
   * Predecessors fetch status
   */
  predecessorsStatus: LoadingState;
  /**
   * Successors fetch status
   */
  successorsStatus: LoadingState;
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

export type LoadingStatusEntry = Partial<{
  status: LoadingStatus;
  reason: FailureReason;
  error: Error;
}>;

export type LoadingState = LoadingStatus | LoadingStatusEntry;

export const getInitialContextQueryState = (): ContextFetchState => ({
  anchor: {} as EsHitRecord,
  predecessors: [],
  successors: [],
  anchorStatus: LoadingStatus.UNINITIALIZED,
  predecessorsStatus: LoadingStatus.UNINITIALIZED,
  successorsStatus: LoadingStatus.UNINITIALIZED,
});
