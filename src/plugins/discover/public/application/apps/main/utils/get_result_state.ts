/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { FetchStatus } from '../../../types';

export const resultStatuses = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading', // initial data load
  READY: 'ready', // results came back
  NO_RESULTS: 'none', // no results came back
};

/**
 * Returns the current state of the result, depends on fetchStatus and the given fetched rows
 * Determines what is displayed in Discover main view (loading view, data view, empty data view, ...)
 */
export function getResultState(fetchStatus: FetchStatus, rows: ElasticSearchHit[]) {
  if (fetchStatus === FetchStatus.UNINITIALIZED) {
    return resultStatuses.UNINITIALIZED;
  }

  const rowsEmpty = !Array.isArray(rows) || rows.length === 0;
  if (rowsEmpty && fetchStatus === FetchStatus.LOADING) return resultStatuses.LOADING;
  else if (!rowsEmpty) return resultStatuses.READY;
  else return resultStatuses.NO_RESULTS;
}
