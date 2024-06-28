/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notFound } from '@hapi/boom';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import { defer } from '@kbn/kibana-utils-plugin/common';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import { debounce } from 'lodash';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  SEARCH_SESSION_TYPE,
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionsFindResponse,
  SearchSessionStatusResponse,
} from '../../../common';
import { ISearchSessionService, NoSearchIdInSessionError } from '../..';
import { createRequestHash } from './utils';
import { ConfigSchema, SearchSessionsConfigSchema } from '../../../config';
import { getSessionStatus } from './get_session_status';

export interface SearchSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface SearchSessionStatusDependencies extends SearchSessionDependencies {
  internalElasticsearchClient: ElasticsearchClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SetupDependencies {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StartDependencies {}

/**
 * Used to batch requests that add searches into the session saved object
 */
const DEBOUNCE_TRACK_ID_WAIT = 1000;
const DEBOUNCE_TRACK_ID_MAX_WAIT = 5000;
interface TrackIdQueueEntry {
  deps: SearchSessionDependencies;
  user: AuthenticatedUser | null;
  sessionId: string;
  resolve: () => void;
  reject: (reason?: unknown) => void;

  searchInfo: SearchSessionRequestInfo;
  requestHash: string;
}

export class SearchSessionService implements ISearchSessionService {
  private sessionConfig: SearchSessionsConfigSchema;
  private setupCompleted = false;

  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigSchema,
    private readonly version: string
  ) {
    this.sessionConfig = this.config.search.sessions;
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    this.setupCompleted = true;
  }

  public start(core: CoreStart, deps: StartDependencies) {
    if (!this.setupCompleted)
      throw new Error('SearchSessionService setup() must be called before start()');
  }

  public stop() {}

  public save = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    {
      name,
      appId,
      locatorId,
      initialState = {},
      restoreState = {},
    }: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    if (!this.sessionConfig.enabled) throw new Error('Search sessions are disabled');
    if (!name) throw new Error('Name is required');
    if (!appId) throw new Error('AppId is required');
    if (!locatorId) throw new Error('locatorId is required');

    return this.create(deps, user, sessionId, {
      name,
      appId,
      locatorId,
      initialState,
      restoreState,
    });
  };

  private create = (
    { savedObjectsClient }: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    this.logger.debug(`SearchSessionService: create | ${sessionId}`);

    const realmType = user?.authentication_realm.type;
    const realmName = user?.authentication_realm.name;
    const username = user?.username;

    return savedObjectsClient.create<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      {
        sessionId,
        expires: new Date(
          Date.now() + this.sessionConfig.defaultExpiration.asMilliseconds()
        ).toISOString(),
        created: new Date().toISOString(),
        idMapping: {},
        version: this.version,
        realmType,
        realmName,
        username,
        ...attributes,
      },
      { id: sessionId }
    );
  };

  public get = async (
    { savedObjectsClient }: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) => {
    this.logger.debug(`get | ${sessionId}`);
    const session = await savedObjectsClient.get<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId
    );
    this.throwOnUserConflict(user, session);

    return session;
  };

  public find = async (
    { savedObjectsClient, internalElasticsearchClient }: SearchSessionStatusDependencies,
    user: AuthenticatedUser | null,
    options: Omit<SavedObjectsFindOptions, 'type'>
  ): Promise<SearchSessionsFindResponse> => {
    const userFilters =
      user === null
        ? []
        : [
            nodeBuilder.is(
              `${SEARCH_SESSION_TYPE}.attributes.realmType`,
              `${user.authentication_realm.type}`
            ),
            nodeBuilder.is(
              `${SEARCH_SESSION_TYPE}.attributes.realmName`,
              `${user.authentication_realm.name}`
            ),
            nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.username`, `${user.username}`),
          ];
    const filterKueryNode =
      typeof options.filter === 'string' ? fromKueryExpression(options.filter) : options.filter;
    const filter = nodeBuilder.and(userFilters.concat(filterKueryNode ?? []));
    const findResponse = await savedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      ...options,
      filter,
      type: SEARCH_SESSION_TYPE,
    });

    const sessionStatuses = await Promise.all(
      findResponse.saved_objects.map(async (so) => {
        const sessionStatus = await getSessionStatus(
          { internalClient: internalElasticsearchClient },
          so.attributes,
          this.sessionConfig
        );

        return sessionStatus;
      })
    );

    return {
      ...findResponse,
      statuses: sessionStatuses.reduce<Record<string, SearchSessionStatusResponse>>(
        (res, { status, errors }, index) => {
          res[findResponse.saved_objects[index].id] = { status, errors };
          return res;
        },
        {}
      ),
    };
  };

  public update = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    this.logger.debug(`SearchSessionService: update | ${sessionId}`);
    if (!this.sessionConfig.enabled) throw new Error('Search sessions are disabled');
    await this.get(deps, user, sessionId); // Verify correct user
    return deps.savedObjectsClient.update<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId,
      {
        ...attributes,
      },
      { retryOnConflict: this.sessionConfig.maxUpdateRetries }
    );
  };

  public async extend(
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    expires: Date
  ) {
    this.logger.debug(`SearchSessionService: extend | ${sessionId}`);
    return this.update(deps, user, sessionId, { expires: expires.toISOString() });
  }

  public cancel = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) => {
    this.logger.debug(`SearchSessionService: cancel | ${sessionId}`);
    return this.update(deps, user, sessionId, {
      isCanceled: true,
    });
  };

  public delete = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) => {
    if (!this.sessionConfig.enabled) throw new Error('Search sessions are disabled');
    this.logger.debug(`SearchSessionService: delete | ${sessionId}`);
    await this.get(deps, user, sessionId); // Verify correct user
    return deps.savedObjectsClient.delete(SEARCH_SESSION_TYPE, sessionId);
  };

  /**
   * Used to batch requests that add searches into the session saved object
   * Requests are grouped and executed per sessionId
   * @private
   */
  private readonly trackIdBatchQueueMap = new Map<
    string /* sessionId */,
    { queue: TrackIdQueueEntry[]; scheduleProcessQueue: () => void }
  >();

  /**
   * Tracks the given search request/search ID in the saved session.
   * Instead of updating search-session saved object immediately, it debounces and batches updates internally,
   * to reduce number of saved object updates and reduce a chance of running over update retries limit
   * @internal
   */
  public trackId = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    options: ISearchOptions
  ) => {
    const { sessionId, strategy = ENHANCED_ES_SEARCH_STRATEGY } = options;
    if (!this.sessionConfig.enabled || !sessionId || !searchId) return;
    if (!searchRequest.params) return;

    const requestHash = createRequestHash(searchRequest.params);

    this.logger.debug(
      `SearchSessionService: trackId | sessionId: "${sessionId}" | searchId:"${searchId}" | requestHash: "${requestHash}"`
    );

    const searchInfo: SearchSessionRequestInfo = {
      id: searchId,
      strategy,
    };

    if (!this.trackIdBatchQueueMap.has(sessionId)) {
      this.trackIdBatchQueueMap.set(sessionId, {
        queue: [],
        scheduleProcessQueue: debounce(
          () => {
            const queue = this.trackIdBatchQueueMap.get(sessionId)?.queue ?? [];
            if (queue.length === 0) return;
            this.trackIdBatchQueueMap.delete(sessionId);
            const batchedIdMapping = queue.reduce<SearchSessionSavedObjectAttributes['idMapping']>(
              (res, next) => {
                res[next.requestHash] = next.searchInfo;
                return res;
              },
              {}
            );
            this.update(queue[0].deps, queue[0].user, sessionId, { idMapping: batchedIdMapping })
              .then(() => {
                queue.forEach((q) => q.resolve());
              })
              .catch((e) => {
                queue.forEach((q) => q.reject(e));
              });
          },
          DEBOUNCE_TRACK_ID_WAIT,
          { maxWait: DEBOUNCE_TRACK_ID_MAX_WAIT }
        ),
      });
    }

    const deferred = defer<void>();
    const { queue, scheduleProcessQueue } = this.trackIdBatchQueueMap.get(sessionId)!;
    queue.push({
      deps,
      sessionId,
      searchInfo,
      requestHash,
      resolve: deferred.resolve,
      reject: deferred.reject,
      user,
    });

    scheduleProcessQueue();

    return deferred.promise;
  };

  public async getSearchIdMapping(
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) {
    const searchSession = await this.get(deps, user, sessionId);

    const searchIdMapping = new Map<string, string>();
    Object.values(searchSession.attributes.idMapping).forEach((requestInfo) => {
      searchIdMapping.set(requestInfo.id, requestInfo.strategy);
    });
    return searchIdMapping;
  }

  public async status(
    deps: SearchSessionStatusDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ): Promise<SearchSessionStatusResponse> {
    this.logger.debug(`SearchSessionService: status | ${sessionId}`);
    const session = await this.get(deps, user, sessionId);

    const sessionStatus = await getSessionStatus(
      { internalClient: deps.internalElasticsearchClient },
      session.attributes,
      this.sessionConfig
    );

    return { status: sessionStatus.status, errors: sessionStatus.errors };
  }

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    searchRequest: IKibanaSearchRequest,
    { sessionId, isStored, isRestore }: ISearchOptions
  ) => {
    if (!this.sessionConfig.enabled) {
      throw new Error('Search sessions are disabled');
    } else if (!sessionId) {
      throw new Error('Session ID is required');
    } else if (!isStored) {
      throw new Error('Cannot get search ID from a session that is not stored');
    } else if (!isRestore) {
      throw new Error('Get search ID is only supported when restoring a session');
    }

    const session = await this.get(deps, user, sessionId);
    const requestHash = createRequestHash(searchRequest.params);
    if (!session.attributes.idMapping.hasOwnProperty(requestHash)) {
      this.logger.error(`SearchSessionService: getId | ${sessionId} | ${requestHash} not found`);
      this.logger.debug(
        `SearchSessionService: getId not found search with params: ${JSON.stringify(
          searchRequest.params
        )}`
      );
      throw new NoSearchIdInSessionError();
    }
    this.logger.debug(`SearchSessionService: getId | ${sessionId} | ${requestHash}`);

    return session.attributes.idMapping[requestHash].id;
  };

  public asScopedProvider = ({ security, savedObjects, elasticsearch }: CoreStart) => {
    return (request: KibanaRequest) => {
      const user = security.authc.getCurrentUser(request) ?? null;
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [SEARCH_SESSION_TYPE],
      });

      const internalElasticsearchClient = elasticsearch.client.asScoped(request).asInternalUser;
      const deps = { savedObjectsClient, internalElasticsearchClient };
      return {
        getId: this.getId.bind(this, deps, user),
        trackId: this.trackId.bind(this, deps, user),
        getSearchIdMapping: this.getSearchIdMapping.bind(this, deps, user),
        save: this.save.bind(this, deps, user),
        get: this.get.bind(this, deps, user),
        find: this.find.bind(this, deps, user),
        update: this.update.bind(this, deps, user),
        extend: this.extend.bind(this, deps, user),
        cancel: this.cancel.bind(this, deps, user),
        delete: this.delete.bind(this, deps, user),
        status: this.status.bind(this, deps, user),
        getConfig: () => this.config.search.sessions,
      };
    };
  };

  private throwOnUserConflict = (
    user: AuthenticatedUser | null,
    session?: SavedObject<SearchSessionSavedObjectAttributes>
  ) => {
    if (user === null || !session) return;
    if (
      user.authentication_realm.type !== session.attributes.realmType ||
      user.authentication_realm.name !== session.attributes.realmName ||
      user.username !== session.attributes.username
    ) {
      this.logger.debug(
        `User ${user.username} has no access to search session ${session.attributes.sessionId}`
      );
      throw notFound();
    }
  };
}
