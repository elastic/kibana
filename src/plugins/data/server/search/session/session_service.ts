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

export type ISearchSessionClient = ReturnType<
  ReturnType<BackgroundSessionService['asScopedProvider']>
>;

export class BackgroundSessionService {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, Map<string, string>>();

  private timeout?: NodeJS.Timeout;

  constructor() {}

  public setup = () => {};

  public start = (core: CoreStart) => {
    return {
      save: this.save,
      trackId: this.trackId,
      asScoped: this.asScopedProvider(core),
    };

    const savedObjectsClient = core.savedObjects.createInternalRepository([
      BACKGROUND_SESSION_TYPE,
    ]);

    (async () => {
      this.timeout = await this.updateBackgroundSessions({ savedObjectsClient });
    })();
  };

  public stop = () => {
    this.clear();
    if (this.timeout) clearTimeout(this.timeout);
  };

  // TODO: Generate the `userId` from the realm type/realm name/username
  public save = (
    sessionId: string,
    name: string,
    url: string,
    userId: string,
    expires: Date = new Date(Date.now() + DEFAULT_EXPIRATION),
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    // Get the mapping of request hash/search ID for this session
    const searchMap = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();

    // Clear out the entries for this session ID so they don't get saved next time
    this.sessionSearchMap.delete(sessionId);

    const idMapping = Object.fromEntries(searchMap.entries());
    const attributes = { name, url, userId, expires: expires.toISOString(), idMapping };
    return savedObjectsClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );
  };

  // TODO: Send 404 if the given ID doesn't belong to this user
  public get = (sessionId: string, { savedObjectsClient }: BackgroundSessionDependencies) => {
    return savedObjectsClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  };

  // TODO: Send 404 if the given ID doesn't belong to this user
  public delete = (sessionId: string, { savedObjectsClient }: BackgroundSessionDependencies) => {
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
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, isStored = false }: ISearchOptions,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    if (!sessionId) return;
    console.log(`trackId ${sessionId}:${searchId}`);
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
        save: (sessionId: string, name: string, url: string, userId: string, expires?: Date) => {
          return this.save(sessionId, name, url, userId, expires, { savedObjectsClient });
        },
        get: (sessionId: string) => {
          return this.get(sessionId, { savedObjectsClient });
        },
        delete: (sessionId: string) => {
          return this.delete(sessionId, { savedObjectsClient });
        },
      };
    };
  };

  private updateBackgroundSessions = async ({
    savedObjectsClient,
  }: BackgroundSessionDependencies): Promise<NodeJS.Timeout> => {
    for (const sessionId in this.sessionSearchMap.keys()) {
      const searchMap = this.sessionSearchMap.get(sessionId);
      const { attributes } = await this.get(sessionId, { savedObjectsClient });
      const idMapping = Object.fromEntries(searchMap.entries());
      console.log(`updateBackgroundSessions ${sessionId}`);
      await savedObjectsClient.update(BACKGROUND_SESSION_TYPE, sessionId, { idMapping });
    }
    return setTimeout(() => this.updateBackgroundSessions({ savedObjectsClient }), 10000);
  };
}
