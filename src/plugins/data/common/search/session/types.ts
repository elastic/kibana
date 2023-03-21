/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { SerializableRecord } from '@kbn/utility-types';
import type { SearchSessionStatus, SearchStatus } from './status';

export const SEARCH_SESSION_TYPE = 'search-session';
export interface SearchSessionSavedObjectAttributes {
  sessionId: string;
  /**
   * User-facing session name to be displayed in session management
   */
  name?: string;
  /**
   * App that created the session. e.g 'discover'
   */
  appId?: string;
  /**
   * Creation time of the session
   */
  created: string;

  /**
   * Expiration time of the session. Expiration itself is managed by Elasticsearch.
   */
  expires: string;

  /**
   * locatorId (see share.url.locators service)
   */
  locatorId?: string;
  /**
   * The application state that was used to create the session.
   * Should be used, for example, to re-load an expired search session.
   */
  initialState?: SerializableRecord;
  /**
   * Application state that should be used to restore the session.
   * For example, relative dates are conveted to absolute ones.
   */
  restoreState?: SerializableRecord;
  /**
   * Mapping of search request hashes to their corresponsing info (async search id, etc.)
   */
  idMapping: Record<string, SearchSessionRequestInfo>;

  /**
   * The realm type/name & username uniquely identifies the user who created this search session
   */
  realmType?: string;
  realmName?: string;
  username?: string;
  /**
   * Version information to display warnings when trying to restore a session from a different version
   */
  version: string;

  /**
   * `true` if session was cancelled
   */
  isCanceled?: boolean;
}

export interface SearchSessionRequestInfo {
  /**
   * ID of the async search request
   */
  id: string;
  /**
   * Search strategy used to submit the search request
   */
  strategy: string;
}

export interface SearchSessionRequestStatus {
  status: SearchStatus;
  /**
   * An optional error. Set if status is set to error.
   */
  error?: string;
}

/**
 * On-the-fly calculated search session status
 */
export interface SearchSessionStatusResponse {
  status: SearchSessionStatus;

  errors?: string[];
}

/**
 * List of search session objects with on-the-fly calculated search session statuses
 */
export interface SearchSessionsFindResponse
  extends SavedObjectsFindResponse<SearchSessionSavedObjectAttributes> {
  /**
   * Map containing calculated statuses of search sessions from the find response
   */
  statuses: Record<string, SearchSessionStatusResponse>;
}
