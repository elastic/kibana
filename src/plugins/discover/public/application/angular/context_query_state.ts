/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '../../../../data/public';
import { EsHitRecord } from './context/api/context';
import { EsHitRecordList } from './context/api/context';
import { SortDirection } from './context/api/utils/sorting';
import { createInitialLoadingStatusState } from './context/query';
import { createInitialQueryParametersState } from './context/query_parameters';

export interface ContextQueryState {
  loadingStatus: LoadingStatusState;
  queryParameters: QueryParameters;
  rows: ContextRows;
  hits: EsHitRecordList;
  predecessors: EsHitRecordList;
  successors: EsHitRecordList;
  anchor: EsHitRecord;
  anchorStatus: LoadingState;
  predecessorsStatus: LoadingState;
  successorsStatus: LoadingState;
  predecessorCount: number;
  successorCount: number;
  useNewFieldsApi: boolean;
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

export interface LoadingStatusState {
  anchor: LoadingStatusEntry | LoadingStatus;
  predecessors: LoadingStatusEntry | LoadingStatus;
  successors: LoadingStatusEntry | LoadingStatus;
}

export type LoadingState = LoadingStatusEntry | LoadingStatus;

export interface QueryParameters {
  anchorId: string;
  columns: string[];
  defaultStepSize: number;
  filters: Filter[];
  indexPatternId: string;
  predecessorCount: number;
  successorCount: number;
  sort: Array<[string, SortDirection]>;
  tieBreakerField: string;
}

export interface ContextRows {
  all: EsHitRecordList;
  anchor: EsHitRecord;
  predecessors: EsHitRecordList;
  successors: EsHitRecordList;
}

export function getContextQueryDefaults(
  indexPatternId: string,
  anchorId: string,
  defaultStepSize: number,
  tieBreakerField: string,
  useNewFieldsApi: boolean
): ContextQueryState {
  return {
    queryParameters: createInitialQueryParametersState(
      indexPatternId,
      anchorId,
      defaultStepSize,
      tieBreakerField
    ),
    hits: [],
    predecessors: [],
    successors: [],
    anchor: {
      fields: [],
      sort: [],
      _id: '',
    },
    rows: {
      all: [],
      anchor: {
        fields: [],
        sort: [],
        _id: '',
      },
      predecessors: [],
      successors: [],
    },
    loadingStatus: createInitialLoadingStatusState(),
    anchorStatus: LoadingStatus.UNINITIALIZED,
    predecessorsStatus: LoadingStatus.UNINITIALIZED,
    successorsStatus: LoadingStatus.UNINITIALIZED,
    predecessorCount: 5,
    successorCount: 5,
    useNewFieldsApi,
  };
}
