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
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from 'src/core/server';
import moment, { Moment } from 'moment';
import {
  BackgroundSessionSavedObjectAttributes,
  IKibanaSearchRequest,
  ISearchOptions,
  SearchSessionFindOptions,
  BackgroundSessionStatus,
} from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { createRequestHash } from './utils';

const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;
export const INMEM_TRACKING_INTERVAL = 2000;
export const INMEM_TRACKING_TIMEOUT_SEC = 60;
export const MAX_UPDATE_RETRIES = 3;

export interface BackgroundSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export type ISearchSessionClient = ReturnType<
  ReturnType<BackgroundSessionService['asScopedProvider']>
>;

export interface SessionInfo {
  insertTime: Moment;
  retryCount: number;
  ids: Map<string, string>;
}

export class BackgroundSessionService {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, SessionInfo>();
  private internalSavedObjectsClient!: SavedObjectsClientContract;
  private monitorInterval!: NodeJS.Timeout;

  constructor(private readonly logger: Logger) {}

  private setupMonitoring = (savedObjects: SavedObjectsServiceStart) => {
    const internalRepo = savedObjects.createInternalRepository();
    this.internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
    this.monitorInterval = setInterval(this.monitorMappedIds.bind(this), INMEM_TRACKING_INTERVAL);
  };

  /**
   * Gets all {@link SessionSavedObjectAttributes | Background Searches} that
   * currently being tracked by the service.
   *	   *
   * @remarks
   * Uses `internalSavedObjectsClient` as this is called asynchronously, not within the
   * context of a user's session.
   */
  private async getAllMappedSavedObjects() {
    const activeMappingIds = Array.from(this.sessionSearchMap.keys()).map((sessionId) => {
      return {
        id: sessionId,
        type: BACKGROUND_SESSION_TYPE,
      };
    });
    const res = await this.internalSavedObjectsClient.bulkGet<BackgroundSessionSavedObjectAttributes>(
      activeMappingIds
    );
    return res.saved_objects;
  }

  private clearSessions = () => {
    this.logger.debug(`clearSessions`);
    const curTime = moment();
    this.sessionSearchMap.forEach((sessionInfo, sessionId) => {
      if (
        moment.duration(curTime.diff(sessionInfo.insertTime)).asSeconds() >
        INMEM_TRACKING_TIMEOUT_SEC
      ) {
        this.logger.debug(`Deleting expired session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      } else if (sessionInfo.retryCount >= MAX_UPDATE_RETRIES) {
        this.logger.warn(`Deleting failed session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      }
    });
  };

  private async monitorMappedIds() {
    try {
      this.logger.debug(`monitorMappedIds. Map contains ${this.sessionSearchMap.size} items`);
      this.clearSessions();

      if (!this.sessionSearchMap.size) return;

      const savedSessions = await this.getAllMappedSavedObjects();
      const updatedSessions = await this.updateAllSavedObjects(savedSessions);

      updatedSessions.forEach((updatedSavedObject) => {
        const sessionInfo = this.sessionSearchMap.get(updatedSavedObject.id)!;
        if (updatedSavedObject.error) {
          // Retry next time
          sessionInfo.retryCount++;
        } else if (updatedSavedObject.attributes.idMapping) {
          // Delete the ids that we just saved, avoiding a potential new ids being lost (?)
          Object.keys(updatedSavedObject.attributes.idMapping).forEach((key) => {
            sessionInfo.ids.delete(key);
          });
          sessionInfo.retryCount = 0;
        }
      });
    } catch (e) {
      this.logger.error(`Error fetching sessions. ${e}`);
    }
  }

  private async updateAllSavedObjects(
    activeMappingObjects: Array<SavedObject<BackgroundSessionSavedObjectAttributes>>
  ) {
    if (!activeMappingObjects.length) return [];

    const updatedSessions = activeMappingObjects?.map((sessionSavedObject) => {
      const sessionInfo = this.sessionSearchMap.get(sessionSavedObject.id);
      const idMapping = sessionInfo ? Object.fromEntries(sessionInfo.ids.entries()) : {};
      sessionSavedObject.attributes.idMapping = {
        ...sessionSavedObject.attributes.idMapping,
        ...idMapping,
      };
      return sessionSavedObject;
    });

    const updateResults = await this.internalSavedObjectsClient.bulkUpdate<BackgroundSessionSavedObjectAttributes>(
      updatedSessions
    );
    return updateResults.saved_objects;
  }

  public setup = () => {};

  public start = (core: CoreStart) => {
    this.setupMonitoring(core.savedObjects);
    return {
      asScoped: this.asScopedProvider(core),
    };
  };

  public stop = () => {
    clearInterval(this.monitorInterval);
    this.sessionSearchMap.clear();
  };

  // TODO: Generate the `userId` from the realm type/realm name/username
  public save = async (
    sessionId: string,
    {
      name,
      created = new Date().toISOString(),
      expires = new Date(Date.now() + DEFAULT_EXPIRATION).toISOString(),
      status = BackgroundSessionStatus.IN_PROGRESS,
      initialState = {},
      restoreState = {},
    }: Partial<BackgroundSessionSavedObjectAttributes>,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    if (!name) throw new Error('Name is required');

    // Get the mapping of request hash/search ID for this session
    const searchMap = this.sessionSearchMap.get(sessionId);
    const idMapping = searchMap ? Object.fromEntries(searchMap.ids.entries()) : {};
    const attributes = { name, created, expires, status, initialState, restoreState, idMapping };
    const session = await savedObjectsClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );

    // Clear out the entries for this session ID so they don't get saved next time
    this.sessionSearchMap.delete(sessionId);

    return session;
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public get = (sessionId: string, { savedObjectsClient }: BackgroundSessionDependencies) => {
    return savedObjectsClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public find = (
    options: SearchSessionFindOptions,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    return savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      ...options,
      type: BACKGROUND_SESSION_TYPE,
    });
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public update = (
    sessionId: string,
    attributes: Partial<BackgroundSessionSavedObjectAttributes>,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    return savedObjectsClient.update<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId,
      attributes
    );
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public delete = (sessionId: string, { savedObjectsClient }: BackgroundSessionDependencies) => {
    return savedObjectsClient.delete(BACKGROUND_SESSION_TYPE, sessionId);
  };

  /**
   * Tracks the given search request/search ID in the saved session (if it exists). Otherwise, just
   * store it in memory until a saved session exists.
   * @internal
   */
  public trackId = async (
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, isStored }: ISearchOptions,
    deps: BackgroundSessionDependencies
  ) => {
    if (!sessionId || !searchId) return;
    const requestHash = createRequestHash(searchRequest.params);

    // If there is already a saved object for this session, update it to include this request/ID.
    // Otherwise, just update the in-memory mapping for this session for when the session is saved.
    if (isStored) {
      const attributes = { idMapping: { [requestHash]: searchId } };
      await this.update(sessionId, attributes, deps);
    } else {
      const map = this.sessionSearchMap.get(sessionId) ?? {
        insertTime: moment(),
        retryCount: 0,
        ids: new Map<string, string>(),
      };
      map.ids.set(requestHash, searchId);
      this.sessionSearchMap.set(sessionId, map);
    }
  };

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    searchRequest: IKibanaSearchRequest,
    { sessionId, isStored, isRestore }: ISearchOptions,
    deps: BackgroundSessionDependencies
  ) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    } else if (!isStored) {
      throw new Error('Cannot get search ID from a session that is not stored');
    } else if (!isRestore) {
      throw new Error('Get search ID is only supported when restoring a session');
    }

    const session = await this.get(sessionId, deps);
    const requestHash = createRequestHash(searchRequest.params);
    if (!session.attributes.idMapping.hasOwnProperty(requestHash)) {
      throw new Error('No search ID in this session matching the given search request');
    }

    return session.attributes.idMapping[requestHash];
  };

  public asScopedProvider = ({ savedObjects }: CoreStart) => {
    return (request: KibanaRequest) => {
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [BACKGROUND_SESSION_TYPE],
      });
      const deps = { savedObjectsClient };
      return {
        save: (sessionId: string, attributes: Partial<BackgroundSessionSavedObjectAttributes>) =>
          this.save(sessionId, attributes, deps),
        get: (sessionId: string) => this.get(sessionId, deps),
        find: (options: SearchSessionFindOptions) => this.find(options, deps),
        update: (sessionId: string, attributes: Partial<BackgroundSessionSavedObjectAttributes>) =>
          this.update(sessionId, attributes, deps),
        delete: (sessionId: string) => this.delete(sessionId, deps),
        trackId: (searchRequest: IKibanaSearchRequest, searchId: string, options: ISearchOptions) =>
          this.trackId(searchRequest, searchId, options, deps),
        getId: (searchRequest: IKibanaSearchRequest, options: ISearchOptions) =>
          this.getId(searchRequest, options, deps),
      };
    };
  };
}
