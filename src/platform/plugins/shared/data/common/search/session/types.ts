/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { SerializableRecord } from '@kbn/utility-types';
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

  /**
   * Search status - used to avoid extra calls to ES when tracking search IDs
   */
  status?: SearchSessionStatus;
}

// For this type we need to omit status because we can't go from it being present to optional
export interface SearchSessionRequestInfo extends Omit<SearchSessionRequestStatus, 'status'> {
  /**
   * ID of the async search request
   */
  id: string;
  /**
   * Search strategy used to submit the search request
   */
  strategy: string;
  /**
   * Search status - used to avoid extra calls to ES when tracking search IDs
   */
  status?: SearchStatus;
}

export interface SearchSessionRequestStatus {
  status: SearchStatus;

  /**
   * Optional start time. May be undefined if ES doesn't return it.
   */
  startedAt?: string;
  /**
   * Optional completion time. May be undefined if the search is still in progress
   */
  completedAt?: string;
  /**
   * An optional error. Set if status is set to error.
   */
  error?: {
    code: number;
    message?: string;
  };
}

/**
 * On-the-fly calculated search session status
 */
export interface SearchSessionStatusResponse {
  status: SearchSessionStatus;

  errors?: string[];
}

export interface SearchSessionStatusesResponse {
  /**
   * Map containing calculated statuses of search sessions
   */
  statuses: Record<string, SearchSessionStatusResponse>;
}

/**
 * List of search session objects with on-the-fly calculated search session statuses
 */
export type SearchSessionsFindResponse =
  SavedObjectsFindResponse<SearchSessionSavedObjectAttributes> & SearchSessionStatusesResponse;
