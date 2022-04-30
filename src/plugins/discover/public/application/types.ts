/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
