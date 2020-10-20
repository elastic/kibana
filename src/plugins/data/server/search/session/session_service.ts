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

import { CoreStart, KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { createRequestHash, IKibanaSearchRequest, ISearchOptions } from '../../../common/search';
import {
  BACKGROUND_SESSION_TYPE,
  BackgroundSessionSavedObjectAttributes,
} from '../../saved_objects';

const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

export interface BackgroundSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export type ISearchSessionClient = Pick<BackgroundSessionService, 'save'>;

export class BackgroundSessionService {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, Map<string, string>>();

  constructor() {}

  public setup = () => {};

  public start = () => {
    return {
      save: this.save,
      trackId: this.trackId,
    };
  };

  public stop = () => {
    this.clear();
  };

  public save = (
    { savedObjectsClient }: BackgroundSessionDependencies,
    sessionId: string,
    expires: Date = new Date(Date.now() + DEFAULT_EXPIRATION)
  ) => {
    // Get the mapping of request hash/search ID for this session
    const searchMap = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();

    // Clear out the entries for this session ID so they don't get saved next time
    this.sessionSearchMap.delete(sessionId);

    const attributes = {
      expires: expires.toISOString(),
      idMapping: Object.fromEntries(searchMap.entries()),
    };
    return savedObjectsClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );
  };

  // TODO: Send 404 if the given ID doesn't belong to this user
  public get = ({ savedObjectsClient }: BackgroundSessionDependencies, sessionId: string) => {
    return savedObjectsClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  };

  // TODO: Send 404 if the given ID doesn't belong to this user
  public delete = ({ savedObjectsClient }: BackgroundSessionDependencies, sessionId: string) => {
    return savedObjectsClient.delete(BACKGROUND_SESSION_TYPE, sessionId);
  };

  /**
   * Tracks the given search request / search ID in memory. Should only be called directly by the
   * search service.
   * @param savedObjectsClient
   * @param searchRequest
   * @param searchId
   * @param sessionId
   * @param isStored
   * @internal
   */
  public trackId = (
    { savedObjectsClient }: BackgroundSessionDependencies,
    searchRequest: IKibanaSearchRequest,
    searchId?: string,
    { sessionId, isStored = false }: ISearchOptions = {}
  ) => {
    if (!sessionId || !searchId) return;
    const requestHash = createRequestHash(searchRequest.params);

    // If there is already a saved object for this session, update it to include this request/ID.
    // Otherwise, just update the in-memory mapping for this session.
    if (isStored) {
      const attributes = {
        idMapping: { [requestHash]: searchId },
      };
      return savedObjectsClient.update<BackgroundSessionSavedObjectAttributes>(
        BACKGROUND_SESSION_TYPE,
        sessionId,
        attributes
      );
    } else {
      const map = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();
      map.set(requestHash, searchId);
      return Promise.resolve(this.sessionSearchMap.set(sessionId, map));
    }
  };

  // TODO: When should we call this? Should we call `deleteId` or something instead?
  public clear = () => {
    this.sessionSearchMap.clear();
  };

  public asScopedProvider = ({ savedObjects }: CoreStart) => {
    return (request: KibanaRequest) => {
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [BACKGROUND_SESSION_TYPE],
      });
      return {
        save: (sessionId: string, expires?: Date) => {
          return this.save({ savedObjectsClient }, sessionId, expires);
        },
        get: (sessionId: string) => {
          return this.get({ savedObjectsClient }, sessionId);
        },
        delete: (sessionId: string) => {
          return this.delete({ savedObjectsClient }, sessionId);
        },
      };
    };
  };
}
