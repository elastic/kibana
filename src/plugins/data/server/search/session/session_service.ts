/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notFound } from '@hapi/boom';
import { debounce } from 'lodash';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsFindOptions,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { AuthenticatedUser, SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  IKibanaSearchRequest,
  ISearchOptions,
  SEARCH_SESSION_TYPE,
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../common';
import { ISearchSessionService, NoSearchIdInSessionError } from '../..';
import { createRequestHash } from './utils';
import { ConfigSchema, SearchSessionsConfigSchema } from '../../../config';
import { SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';

export interface SearchSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;

  /**
   * Needed for using async search status API
   */
  internalElasticsearchClient: ElasticsearchClient;
}
interface SetupDependencies {
  security?: SecurityPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StartDependencies {}

const DEBOUNCE_UPDATE_OR_CREATE_WAIT = 1000;
const DEBOUNCE_UPDATE_OR_CREATE_MAX_WAIT = 5000;

interface UpdateOrCreateQueueEntry {
  deps: SearchSessionDependencies;
  user: AuthenticatedUser | null;
  sessionId: string;
  attributes: Partial<SearchSessionSavedObjectAttributes>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export class SearchSessionService
  implements ISearchSessionService<SearchSessionSavedObjectAttributes>
{
  private sessionConfig: SearchSessionsConfigSchema;
  private readonly updateOrCreateBatchQueue: UpdateOrCreateQueueEntry[] = [];
  private security?: SecurityPluginSetup;
  private setupCompleted = false;

  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigSchema,
    private readonly version: string
  ) {
    this.sessionConfig = this.config.search.sessions;
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    this.security = deps.security;

    this.setupCompleted = true;
  }

  public start(core: CoreStart, deps: StartDependencies) {
    if (!this.setupCompleted)
      throw new Error('SearchSessionService setup() must be called before start()');
  }

  public stop() {}

  private processUpdateOrCreateBatchQueue = debounce(
    () => {
      const queue = [...this.updateOrCreateBatchQueue];
      if (queue.length === 0) return;
      this.updateOrCreateBatchQueue.length = 0;
      const batchedSessionAttributes = queue.reduce((res, next) => {
        if (!res[next.sessionId]) {
          res[next.sessionId] = next.attributes;
        } else {
          res[next.sessionId] = {
            ...res[next.sessionId],
            ...next.attributes,
            idMapping: {
              ...res[next.sessionId].idMapping,
              ...next.attributes.idMapping,
            },
          };
        }
        return res;
      }, {} as { [sessionId: string]: Partial<SearchSessionSavedObjectAttributes> });

      Object.keys(batchedSessionAttributes).forEach((sessionId) => {
        const thisSession = queue.filter((s) => s.sessionId === sessionId);
        this.updateOrCreate(
          thisSession[0].deps,
          thisSession[0].user,
          sessionId,
          batchedSessionAttributes[sessionId]
        )
          .then(() => {
            thisSession.forEach((s) => s.resolve());
          })
          .catch((e) => {
            thisSession.forEach((s) => s.reject(e));
          });
      });
    },
    DEBOUNCE_UPDATE_OR_CREATE_WAIT,
    { maxWait: DEBOUNCE_UPDATE_OR_CREATE_MAX_WAIT }
  );
  private scheduleUpdateOrCreate = (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.updateOrCreateBatchQueue.push({ deps, user, sessionId, attributes, resolve, reject });
      // TODO: this would be better if we'd debounce per sessionId
      this.processUpdateOrCreateBatchQueue();
    });
  };

  private updateOrCreate = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>,
    retry: number = 1
  ): Promise<SavedObject<SearchSessionSavedObjectAttributes> | undefined> => {
    const retryOnConflict = async (e: any) => {
      this.logger.debug(`Conflict error | ${sessionId}`);
      // Randomize sleep to spread updates out in case of conflicts
      await sleep(100 + Math.random() * 50);
      return await this.updateOrCreate(deps, user, sessionId, attributes, retry + 1);
    };

    this.logger.debug(`updateOrCreate | ${sessionId} | ${retry}`);
    try {
      return (await this.update(
        deps,
        user,
        sessionId,
        attributes
      )) as SavedObject<SearchSessionSavedObjectAttributes>;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        try {
          this.logger.debug(`Object not found | ${sessionId}`);
          return await this.create(deps, user, sessionId, attributes);
        } catch (createError) {
          if (
            SavedObjectsErrorHelpers.isConflictError(createError) &&
            retry < this.sessionConfig.maxUpdateRetries
          ) {
            return await retryOnConflict(createError);
          } else {
            this.logger.error(createError);
          }
        }
      } else if (
        SavedObjectsErrorHelpers.isConflictError(e) &&
        retry < this.sessionConfig.maxUpdateRetries
      ) {
        return await retryOnConflict(e);
      } else {
        this.logger.error(e);
      }
    }

    return undefined;
  };

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

    return this.updateOrCreate(deps, user, sessionId, {
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
    this.logger.debug(`create | ${sessionId}`);

    const realmType = user?.authentication_realm.type;
    const realmName = user?.authentication_realm.name;
    const username = user?.username;

    return savedObjectsClient.create<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      {
        sessionId,
        status: SearchSessionStatus.IN_PROGRESS,
        expires: new Date(
          Date.now() + this.sessionConfig.defaultExpiration.asMilliseconds()
        ).toISOString(),
        created: new Date().toISOString(),
        touched: new Date().toISOString(),
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
    { savedObjectsClient, internalElasticsearchClient }: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    checkStatus: boolean = false // TODO: make it cleaner
  ) => {
    this.logger.debug(`get | ${sessionId}`);
    const session = await savedObjectsClient.get<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId
    );
    this.throwOnUserConflict(user, session);

    if (checkStatus) {
      const sessionStatus = await getSessionStatus(
        { internalClient: internalElasticsearchClient },
        session.attributes,
        this.sessionConfig
      );
      session.attributes.status = sessionStatus;
    }

    return session;
  };

  public find = async (
    { savedObjectsClient, internalElasticsearchClient }: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    options: Omit<SavedObjectsFindOptions, 'type'>
  ) => {
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

    // TODO: make it cleaner
    findResponse.saved_objects = await Promise.all(
      findResponse.saved_objects.map(async (so) => {
        const sessionStatus = await getSessionStatus(
          { internalClient: internalElasticsearchClient },
          so.attributes,
          this.sessionConfig
        );
        so.attributes.status = sessionStatus;
        return so;
      })
    );

    return findResponse;
  };

  public update = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    this.logger.debug(`update | ${sessionId}`);
    if (!this.sessionConfig.enabled) throw new Error('Search sessions are disabled');
    await this.get(deps, user, sessionId); // Verify correct user
    return deps.savedObjectsClient.update<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId,
      {
        ...attributes,
        touched: new Date().toISOString(),
      }
    );
  };

  public async extend(
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string,
    expires: Date
  ) {
    this.logger.debug(`extend | ${sessionId}`);
    return this.update(deps, user, sessionId, { expires: expires.toISOString() });
  }

  public cancel = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) => {
    this.logger.debug(`cancel | ${sessionId}`);
    return this.update(deps, user, sessionId, {
      status: SearchSessionStatus.CANCELLED,
    });
  };

  public delete = async (
    deps: SearchSessionDependencies,
    user: AuthenticatedUser | null,
    sessionId: string
  ) => {
    if (!this.sessionConfig.enabled) throw new Error('Search sessions are disabled');
    this.logger.debug(`delete | ${sessionId}`);
    await this.get(deps, user, sessionId); // Verify correct user
    return deps.savedObjectsClient.delete(SEARCH_SESSION_TYPE, sessionId);
  };

  /**
   * Tracks the given search request/search ID in the saved session.
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
    this.logger.debug(`trackId | ${sessionId} | ${searchId}`);

    let idMapping: Record<string, SearchSessionRequestInfo> = {};

    if (searchRequest.params) {
      const requestHash = createRequestHash(searchRequest.params);
      const searchInfo = {
        id: searchId,
        strategy,
        status: SearchStatus.IN_PROGRESS,
      };
      idMapping = { [requestHash]: searchInfo };
    }

    await this.scheduleUpdateOrCreate(deps, user, sessionId, { idMapping });
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
      this.logger.error(`getId | ${sessionId} | ${requestHash} not found`);
      throw new NoSearchIdInSessionError();
    }
    this.logger.debug(`getId | ${sessionId} | ${requestHash}`);

    return session.attributes.idMapping[requestHash].id;
  };

  public asScopedProvider = ({ savedObjects, elasticsearch }: CoreStart) => {
    return (request: KibanaRequest) => {
      const user = this.security?.authc.getCurrentUser(request) ?? null;
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
