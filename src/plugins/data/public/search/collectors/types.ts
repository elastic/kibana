/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export enum SEARCH_EVENT_TYPE {
  /**
   * A search reached the timeout configured in UI setting search:timeout
   */
  QUERY_TIMED_OUT = 'queryTimedOut',
  /**
   * The session indicator was automatically brought up because of a long running query
   */
  SESSION_INDICATOR_TOUR_LOADING = 'sessionIndicatorTourLoading',
  /**
   * The session indicator was automatically brought up because of a restored session
   */
  SESSION_INDICATOR_TOUR_RESTORED = 'sessionIndicatorTourRestored',
  /**
   * The session indicator was disabled because of a completion timeout
   */
  SESSION_INDICATOR_SAVE_DISABLED = 'sessionIndicatorSaveDisabled',
  /**
   * The user clicked to continue a session in the background (prior to results completing)
   */
  SESSION_SENT_TO_BACKGROUND = 'sessionSentToBackground',
  /**
   * The user clicked to save the session (after results completing)
   */
  SESSION_SAVED_RESULTS = 'sessionSavedResults',
  /**
   * The user clicked to view a completed session
   */
  SESSION_VIEW_RESTORED = 'sessionViewRestored',
  /**
   * The session was successfully restored upon a user navigating
   */
  SESSION_IS_RESTORED = 'sessionIsRestored',
  /**
   * The user clicked to reload an expired/cancelled session
   */
  SESSION_RELOADED = 'sessionReloaded',
  /**
   * The user clicked to extend the expiration of a session
   */
  SESSION_EXTENDED = 'sessionExtended',
  /**
   * The user clicked to cancel a session
   */
  SESSION_CANCELLED = 'sessionCancelled',
  /**
   * The user clicked to delete a session
   */
  SESSION_DELETED = 'sessionDeleted',
  /**
   * The user clicked a link to view the list of sessions
   */
  SESSION_VIEW_LIST = 'sessionViewList',
  /**
   * The user landed on the sessions management page
   */
  SESSIONS_LIST_LOADED = 'sessionsListLoaded',
}

export interface SearchUsageCollector {
  trackQueryTimedOut: () => Promise<void>;
  trackSessionIndicatorTourLoading: () => Promise<void>;
  trackSessionIndicatorTourRestored: () => Promise<void>;
  trackSessionIndicatorSaveDisabled: () => Promise<void>;
  trackSessionSentToBackground: () => Promise<void>;
  trackSessionSavedResults: () => Promise<void>;
  trackSessionViewRestored: () => Promise<void>;
  trackSessionIsRestored: () => Promise<void>;
  trackSessionReloaded: () => Promise<void>;
  trackSessionExtended: () => Promise<void>;
  trackSessionCancelled: () => Promise<void>;
  trackSessionDeleted: () => Promise<void>;
  trackViewSessionsList: () => Promise<void>;
  trackSessionsListLoaded: () => Promise<void>;
}
