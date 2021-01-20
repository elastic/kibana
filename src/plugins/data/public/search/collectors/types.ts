/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export enum SEARCH_EVENT_TYPE {
  QUERY_TIMED_OUT = 'queryTimedOut',
  QUERIES_CANCELLED = 'queriesCancelled',
}

export interface SearchUsageCollector {
  trackQueryTimedOut: () => Promise<void>;
  trackQueriesCancelled: () => Promise<void>;
}
