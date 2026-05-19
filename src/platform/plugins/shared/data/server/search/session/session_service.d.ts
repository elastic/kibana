import type { CoreSetup, CoreStart, KibanaRequest, Logger, SavedObject, SavedObjectsClientContract, SavedObjectsFindOptions, ElasticsearchClient } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';
import type { SearchSessionSavedObjectAttributes, SearchSessionsFindResponse, SearchSessionStatusesResponse, SearchSessionStatusResponse } from '../../../common';
import type { ISearchSessionService } from '../..';
import type { ConfigSchema } from '../../config';
export interface SearchSessionDependencies {
    savedObjectsClient: SavedObjectsClientContract;
}
export interface SearchSessionStatusDependencies extends SearchSessionDependencies {
    asCurrentUserElasticsearchClient: ElasticsearchClient;
}
interface SetupDependencies {
}
interface StartDependencies {
}
export declare class SearchSessionService implements ISearchSessionService {
    private readonly logger;
    private readonly config;
    private readonly version;
    private sessionConfig;
    private setupCompleted;
    private searchSessionEBTManager?;
    constructor(logger: Logger, config: ConfigSchema, version: string);
    setup(core: CoreSetup, deps: SetupDependencies): void;
    start(core: CoreStart, deps: StartDependencies): void;
    stop(): void;
    save: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string, { name, appId, locatorId, initialState, restoreState, }: Partial<SearchSessionSavedObjectAttributes>) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
    private create;
    get: ({ savedObjectsClient }: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string, skipRealmCheck?: boolean) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
    find: ({ savedObjectsClient, asCurrentUserElasticsearchClient }: SearchSessionStatusDependencies, user: AuthenticatedUser | null, options: Omit<SavedObjectsFindOptions, "type">) => Promise<SearchSessionsFindResponse>;
    update: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>, skipRealmCheck?: boolean) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    extend(deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string, expires: Date): Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    cancel: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
    delete: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string) => Promise<{}>;
    /**
     * Used to batch requests that add searches into the session saved object
     * Requests are grouped and executed per sessionId
     * @internal
     */
    private readonly trackIdBatchQueueMap;
    /**
     * Tracks the given search request/search ID in the saved session.
     * Instead of updating search-session saved object immediately, it debounces and batches updates internally,
     * to reduce number of saved object updates and reduce a chance of running over update retries limit
     * @internal
     */
    trackId: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, searchId: string, options: ISearchOptions, skipRealmCheck?: boolean) => Promise<void>;
    getSearchIdMapping(deps: SearchSessionDependencies, user: AuthenticatedUser | null, sessionId: string): Promise<Map<string, string>>;
    status(deps: SearchSessionStatusDependencies, user: AuthenticatedUser | null, sessionId: string): Promise<SearchSessionStatusResponse>;
    updateStatuses(deps: SearchSessionStatusDependencies, user: AuthenticatedUser | null, sessionIds: string[]): Promise<SearchSessionStatusesResponse>;
    private bulkGet;
    /**
     * Look up an existing search ID that matches the given request in the given session so that the
     * request can continue rather than restart.
     * @internal
     */
    getId: (deps: SearchSessionDependencies, user: AuthenticatedUser | null, searchRequest: IKibanaSearchRequest, { sessionId, isStored, isRestore, requestHash }: ISearchOptions, skipRealmCheck?: boolean) => Promise<string>;
    asScopedProvider: ({ security, savedObjects, elasticsearch }: CoreStart) => (request: KibanaRequest) => {
        getId: (searchRequest: IKibanaSearchRequest<any>, args_1: ISearchOptions, skipRealmCheck?: boolean | undefined) => Promise<string>;
        trackId: (searchId: string, options: ISearchOptions, skipRealmCheck?: boolean | undefined) => Promise<void>;
        getSearchIdMapping: (sessionId: string) => Promise<Map<string, string>>;
        save: (sessionId: string, args_1: Partial<SearchSessionSavedObjectAttributes>) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
        get: (sessionId: string, skipRealmCheck?: boolean | undefined) => Promise<SavedObject<SearchSessionSavedObjectAttributes>>;
        find: (options: Omit<SavedObjectsFindOptions, "type">) => Promise<SearchSessionsFindResponse>;
        update: (sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>, skipRealmCheck?: boolean | undefined) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
        extend: (sessionId: string, expires: Date) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
        cancel: (sessionId: string) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
        delete: (sessionId: string) => Promise<{}>;
        status: (sessionId: string) => Promise<SearchSessionStatusResponse>;
        updateStatuses: (sessionIds: string[]) => Promise<SearchSessionStatusesResponse>;
        getConfig: () => Readonly<{} & {
            enabled: boolean;
            management: Readonly<{} & {
                maxSessions: number;
                refreshInterval: import("moment").Duration;
                refreshTimeout: import("moment").Duration;
                expiresSoonWarning: import("moment").Duration;
            }>;
            notTouchedTimeout: import("moment").Duration;
            maxUpdateRetries: number;
            defaultExpiration: import("moment").Duration;
        }>;
    };
    private throwOnUserConflict;
    private mapSessionStatusesToResponse;
    private mapSessionStatusToResponse;
    private mapSearchError;
}
export {};
