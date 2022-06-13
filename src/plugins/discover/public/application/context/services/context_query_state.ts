/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataDocumentMsgResultDoc } from '../../main/utils/use_saved_search';

export interface ContextFetchState {
  /**
   * Documents listed before anchor
   */
  predecessors: DataDocumentMsgResultDoc[];
  /**
   * Documents after anchor
   */
  successors: DataDocumentMsgResultDoc[];
  /**
   * Anchor document
   */
  anchor: DataDocumentMsgResultDoc;
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
  anchor: {} as DataDocumentMsgResultDoc,
  predecessors: [],
  successors: [],
  anchorStatus: { value: LoadingStatus.UNINITIALIZED },
  predecessorsStatus: { value: LoadingStatus.UNINITIALIZED },
  successorsStatus: { value: LoadingStatus.UNINITIALIZED },
});
