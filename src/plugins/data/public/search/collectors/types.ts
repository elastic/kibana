/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum SEARCH_EVENT_TYPE {
  QUERY_TIMED_OUT = 'queryTimedOut',
  QUERIES_CANCELLED = 'queriesCancelled',
  SESSION_SENT_TO_BACKGROUND = 'sessionSentToBackground',
  SESSION_SAVED_RESULTS = 'sessionSavedResults',
  SESSION_RESTORED = 'sessionRestored',
  SESSION_RELOADED = 'sessionReloaded',
  SESSION_EXTENDED = 'sessionExtended',
  SESSION_CANCELLED = 'sessionCancelled',
}

export interface SearchUsageCollector {
  trackQueryTimedOut: () => Promise<void>;
  trackQueriesCancelled: () => Promise<void>;
  trackSessionSentToBackground: () => Promise<void>;
  trackSessionSavedResults: () => Promise<void>;
  trackSessionRestored: () => Promise<void>;
  trackSessionReloaded: () => Promise<void>;
  trackSessionExtended: () => Promise<void>;
  trackSessionCancelled: () => Promise<void>;
}
