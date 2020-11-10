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

import {
  CoreStart,
  ISavedObjectsRepository,
  KibanaRequest,
  SavedObjectsClientContract,
} from 'kibana/server';
import {
  createRequestHash,
  IKibanaSearchRequest,
  ISearchOptions,
  SearchSessionFindOptions,
} from '../../../common/search';
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

  private internalSavedObjectsRepo?: ISavedObjectsRepository;

  private timeout?: NodeJS.Timeout;

  constructor() {}

  public setup = () => {};

  public start = (core: CoreStart) => {
    return {
      save: this.save,
      trackId: this.trackId,
      asScoped: this.asScopedProvider(core),
    };

    // this.internalSavedObjectsRepo = core.savedObjects.createInternalRepository([
    //   BACKGROUND_SESSION_TYPE,
    // ]);
    //
    // this.timeout = setTimeout(this.updateBackgroundSessions, 10000);
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
  public find = (
    options: SearchSessionFindOptions,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    return savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      ...options,
      type: BACKGROUND_SESSION_TYPE,
    });
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
  public trackId = async (
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, isStored = false }: ISearchOptions,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    if (!sessionId) return;
    const requestHash = createRequestHash(searchRequest.params);

    // If there is already a saved object for this session, update it to include this request/ID.
    // Otherwise, just update the in-memory mapping for this session.
    if (isStored) {
      const attributes = {
        idMapping: { [requestHash]: searchId },
      };
      await savedObjectsClient.update<BackgroundSessionSavedObjectAttributes>(
        BACKGROUND_SESSION_TYPE,
        sessionId,
        attributes
      );
    } else {
      const map = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();
      map.set(requestHash, searchId);
      this.sessionSearchMap.set(sessionId, map);
    }
  };

  public getId = async (
    searchRequest: IKibanaSearchRequest,
    sessionId: string,
    deps: BackgroundSessionDependencies
  ) => {
    const session = await this.get(sessionId, deps);
    const requestHash = createRequestHash(searchRequest.params);
    if (!session.attributes.idMapping.hasOwnProperty(requestHash)) {
      throw new Error(
        `Search request is not associated with session. Are you sure you searched with the same parameters?`
      );
    }
    return session.attributes.idMapping[requestHash];
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
      const deps = { savedObjectsClient };
      return {
        save: (sessionId: string, name: string, url: string, userId: string, expires?: Date) =>
          this.save(sessionId, name, url, userId, expires, deps),
        get: (sessionId: string) => this.get(sessionId, deps),
        find: (options: SearchSessionFindOptions) => this.find(options, deps),
        delete: (sessionId: string) => this.delete(sessionId, deps),
      };
    };
  };

  // private updateBackgroundSessions = async (): Promise<NodeJS.Timeout> => {
  //   for (const [sessionId, searchMap] of this.sessionSearchMap.entries()) {
  //     const idMapping = Object.fromEntries(searchMap.entries());
  //     await this.internalSavedObjectsRepo!.update(BACKGROUND_SESSION_TYPE, sessionId, {
  //       idMapping,
  //     });
  //   }
  //   return (this.timeout = setTimeout(this.updateBackgroundSessions, 10000));
  // };
}
