/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Filter } from '../../../data/public';
import { DiscoverServices } from '../build_services';

export enum FetchStatus {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export type EsHitRecord = Required<
  Pick<estypes.SearchHit, '_id' | 'fields' | 'sort' | '_index' | '_version'>
> & {
  _source?: Record<string, unknown>;
  _score?: number;
  // note that this a special property for Discover Context, to determine the anchor record
  isAnchor?: boolean;
};
export type EsHitRecordList = EsHitRecord[];

export interface DiscoverRouteProps {
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

export interface AppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
}

export interface GetStateReturn<T> {
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<T>) => void;
}
