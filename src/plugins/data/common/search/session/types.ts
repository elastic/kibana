/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';

export interface ISessionService {
  /**
   * Returns the active session ID
   * @returns The active session ID
   */
  getSessionId: () => string | undefined;
  /**
   * Returns the observable that emits an update every time the session ID changes
   * @returns `Observable`
   */
  getSession$: () => Observable<string | undefined>;

  /**
   * Whether the active session is already saved (i.e. sent to background)
   */
  isStored: () => boolean;

  /**
   * Whether the active session is restored (i.e. reusing previous search IDs)
   */
  isRestore: () => boolean;

  /**
   * Starts a new session
   */
  start: () => string;

  /**
   * Restores existing session
   */
  restore: (sessionId: string) => Promise<any>;

  /**
   * Clears the active session.
   */
  clear: () => void;

  /**
   * Saves a session
   */
  save: (name: string, url: string) => Promise<any>;

  /**
   * Gets a saved session
   */
  get: (sessionId: string) => Promise<any>;

  /**
   * Gets a list of saved sessions
   */
  find: (options: SearchSessionFindOptions) => Promise<any>;

  /**
   * Updates a session
   */
  update: (
    sessionId: string,
    attributes: Partial<BackgroundSessionSavedObjectAttributes>
  ) => Promise<any>;

  /**
   * Deletes a session
   */
  delete: (sessionId: string) => Promise<any>;
}

export interface BackgroundSessionSavedObjectAttributes {
  name: string;
  url: string;
  expires: string;
  idMapping: Record<string, string>;
}

export interface SearchSessionFindOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}
