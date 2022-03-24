/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsHitRecord, EsHitRecordList } from '../../types';

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
  anchorStatus: LoadingStatusEntry;
  /**
   * Predecessors fetch status
   */
  predecessorsStatus: LoadingStatusEntry;
  /**
   * Successors fetch status
   */
  successorsStatus: LoadingStatusEntry;
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
  anchor: {} as EsHitRecord,
  predecessors: [],
  successors: [],
  anchorStatus: { value: LoadingStatus.UNINITIALIZED },
  predecessorsStatus: { value: LoadingStatus.UNINITIALIZED },
  successorsStatus: { value: LoadingStatus.UNINITIALIZED },
});
