/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { SearchSessionStatus } from './status';

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
   * Last touch time of the session
   */
  touched: string;
  /**
   * Expiration time of the session. Expiration itself is managed by Elasticsearch.
   */
  expires: string;
  /**
   * Time of transition into completed state,
   *
   * Can be "null" in case already completed session
   * transitioned into in-progress session
   */
  completed?: string | null;
  /**
   * status
   */
  status: SearchSessionStatus;
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
   * This value is true if the session was actively stored by the user. If it is false, the session may be purged by the system.
   */
  persisted: boolean;
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
  /**
   * status
   */
  status: string;
  /**
   * An optional error. Set if status is set to error.
   */
  error?: string;
}

export interface SearchSessionFindOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}
