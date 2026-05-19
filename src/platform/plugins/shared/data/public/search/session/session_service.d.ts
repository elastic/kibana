import type { PublicContract, SerializableRecord } from '@kbn/utility-types';
import { type Observable } from 'rxjs';
import type { PluginInitializerContext, StartServicesAccessor } from '@kbn/core/public';
import type { IKibanaSearchResponse, ISearchOptions } from '@kbn/search-types';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { ConfigSchema } from '../../../server/config';
import type { SessionMeta, SessionStateContainer } from './search_session_state';
import { SearchSessionState } from './search_session_state';
import type { ISessionsClient } from './sessions_client';
import type { NowProviderInternalContract } from '../../now_provider';
import type { ISearchSessionEBTManager } from './ebt_manager';
export type ISessionService = PublicContract<SessionService>;
interface TrackSearchDescriptor {
    /**
     * Cancel the search
     */
    abort: (reason: AbortReason) => void;
    /**
     * Used for polling after running in background (to ensure the search makes it into the background search saved
     * object) and also to keep the search alive while other search requests in the session are still in progress
     * @param abortSignal - signal that can be used to cancel the polling - otherwise the `searchAbortController.getSignal()` is used
     */
    poll: (abortSignal?: AbortSignal) => Promise<void>;
    /**
     * Notify search that session is being saved, could be used to restart the search with different params
     * @deprecated - this is used as an escape hatch for TSVB/Timelion to restart a search with different params
     */
    onSavingSession?: (options: Required<Pick<ISearchOptions, 'sessionId' | 'isRestore' | 'isStored'>>) => Promise<void>;
}
interface TrackSearchMeta {
    /**
     * Time that indicates when last time this search was polled
     */
    lastPollingTime: Date;
    /**
     * If the keep_alive of this search was extended up to saved session keep_alive
     */
    isStored: boolean;
}
/**
 * Api to manage tracked search
 */
interface TrackSearchHandler {
    /**
     * Transition search into "complete" status
     */
    complete(response?: IKibanaSearchResponse): void;
    /**
     * Transition search into "error" status
     */
    error(error?: Error): void;
    /**
     * Call to notify when search is about to be polled to get current search state to build `searchOptions` from (mainly isSearchStored),
     * When poll completes or errors, call `afterPoll` callback and confirm is search was successfully stored
     */
    beforePoll(): [
        currentSearchState: {
            isSearchStored: boolean;
        },
        afterPoll: (newSearchState: {
            isSearchStored: boolean;
        }) => void
    ];
}
/**
 * Represents a search session state in {@link SessionService} in any given moment of time
 */
export type SessionSnapshot = SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>;
/**
 * Provide info about current search session to be stored in the Search Session saved object
 */
export interface SearchSessionInfoProvider<P extends SerializableRecord = SerializableRecord> {
    /**
     * User-facing name of the session.
     * e.g. will be displayed in saved Search Sessions management list
     */
    getName: () => Promise<string>;
    /**
     * Append session start time to a session name,
     * `true` by default
     */
    appendSessionStartTimeToName?: boolean;
    getLocatorData: () => Promise<{
        id: string;
        initialState: P;
        restoreState: P;
    }>;
}
/**
 * Configure a "Background search indicator" UI
 */
interface SearchSessionIndicatorUiConfig {
    /**
     * App controls if "Search session indicator" UI should be disabled.
     * reasonText will appear in a tooltip.
     *
     * Could be used, for example, to disable "Search session indicator" UI
     * in case user doesn't have permissions to store a search session
     */
    isDisabled: () => {
        disabled: true;
        reasonText: string;
    } | {
        disabled: false;
    };
}
/**
 * Responsible for tracking a current search session. Supports a single session at a time.
 */
export declare class SessionService {
    private readonly sessionsClient;
    private readonly nowProvider;
    readonly state$: Observable<SearchSessionState>;
    private readonly state;
    readonly sessionMeta$: Observable<SessionMeta>;
    private searchSessionInfoProvider?;
    private searchSessionIndicatorUiConfig?;
    private subscription;
    private currentApp?;
    private hasAccessToSearchSessions;
    private toastService?;
    private searchSessionEBTManager?;
    private sessionSnapshots;
    private logger;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>, getStartServices: StartServicesAccessor, searchSessionEBTManager: ISearchSessionEBTManager, sessionsClient: ISessionsClient, nowProvider: NowProviderInternalContract, { freezeState }?: {
        freezeState: boolean;
    });
    /**
     * If user has access to search sessions
     * This resolves to `true` in case at least one app allows user to create search session
     * In this case search session management is available
     */
    hasAccess(): boolean;
    /**
     * Used to track searches within current session
     *
     * @param searchDescriptor - uniq object that will be used to as search identifier
     * @returns {@link TrackSearchHandler}
     */
    trackSearch(searchDescriptor: TrackSearchDescriptor): TrackSearchHandler;
    destroy(): void;
    /**
     * Get current session id
     */
    getSessionId(): string | undefined;
    /**
     * Get observable for current session id
     */
    getSession$(): Observable<string | undefined>;
    /**
     * Is current session in process of saving
     */
    isSaving(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
    /**
     * Is current session already saved as SO (send to background)
     */
    isStored(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
    /**
     * Is restoring the older saved searches
     */
    isRestore(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
    /**
     * Start a new search session
     * @returns sessionId
     */
    start(): string;
    /**
     * Restore previously saved search session
     * @param sessionId
     */
    restore(sessionId: string): Promise<void>;
    /**
     * Continue previous search session
     * Can be used to restore all the information of a previous search session after a new one has been started. It is useful
     * to continue a session in different apps or across different discover tabs.
     *
     * This is different from {@link restore} as it reuses search session state and search results held in client memory instead of restoring search results from elasticsearch
     * @param sessionId
     * @param keepSearches indicates if restoring the session also restores the tracked searches or starts with an empty tracking list
     */
    continue(sessionId: string, keepSearches?: boolean): void;
    /**
     * Resets the current search session state.
     * Can be used to reset to a default state without clearing initialization info, such as when switching between discover tabs.
     *
     * This is different from {@link clear} as it does not reset initialization info set through {@link enableStorage}.
     */
    reset(): void;
    private storeSessionSnapshot;
    /**
     * Cleans up current state
     */
    clear(): void;
    /**
     * Request a cancellation of on-going search requests within current session
     */
    cancel({ source }: {
        source: string;
    }): Promise<void>;
    /**
     * Save current session as SO to get back to results later
     * (Send to background)
     */
    save(trackingProps: {
        entryPoint: string;
    }): Promise<import("./sessions_client").SearchSessionSavedObject>;
    /**
     * Change user-facing name of a current session
     * Doesn't throw in case of API error but presents a notification toast instead
     * @param newName - new session name
     */
    renameCurrentSession(newName: string): Promise<void>;
    /**
     * Checks if passed sessionId is a current sessionId
     * @param sessionId
     */
    isCurrentSession(sessionId?: string): boolean;
    /**
     * Infers search session options for sessionId using current session state
     *
     * In case user doesn't has access to `search-session` SO returns null,
     * meaning that sessionId and other session parameters shouldn't be used when doing searches
     *
     * @param sessionId
     */
    getSearchOptions(sessionId?: string): Required<Pick<ISearchOptions, 'sessionId' | 'isRestore' | 'isStored'>> | null;
    /**
     * Provide an info about current session which is needed for storing a search session.
     * To opt-into "Search session indicator" UI app has to call {@link enableStorage}.
     *
     * @param searchSessionInfoProvider - info provider for saving a search session
     * @param searchSessionIndicatorUiConfig - config for "Search session indicator" UI
     */
    enableStorage<P extends SerializableRecord>(searchSessionInfoProvider: SearchSessionInfoProvider<P>, searchSessionIndicatorUiConfig?: SearchSessionIndicatorUiConfig): void;
    /**
     * If the current app explicitly called {@link enableStorage} and provided all configuration needed
     * for storing its search sessions
     */
    isSessionStorageReady(): boolean;
    getSearchSessionIndicatorUiConfig(): SearchSessionIndicatorUiConfig;
    private refreshSearchSessionSavedObject;
}
export {};
