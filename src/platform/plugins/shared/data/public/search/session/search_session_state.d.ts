import type { Observable } from 'rxjs';
import type { StateContainer } from '@kbn/kibana-utils-plugin/public';
import type { SearchSessionSavedObject } from './sessions_client';
/**
 * Possible state that current session can be in
 *
 * @public
 */
export declare enum SearchSessionState {
    /**
     * Session is not active, e.g. didn't start
     */
    None = "none",
    /**
     * Pending search request has not been sent to the background yet
     */
    Loading = "loading",
    /**
     * No action was taken and the page completed loading without search session creation.
     */
    Completed = "completed",
    /**
     * Search session was sent to the background.
     * The page is loading in background.
     */
    BackgroundLoading = "backgroundLoading",
    /**
     * Page load completed with search session created.
     */
    BackgroundCompleted = "backgroundCompleted",
    /**
     * Revisiting the page after background completion
     */
    Restored = "restored",
    /**
     * Current session requests where explicitly canceled by user
     * Displaying none or partial results
     */
    Canceled = "canceled"
}
/**
 * State of the tracked search
 */
export declare enum TrackedSearchState {
    InProgress = "inProgress",
    Completed = "completed",
    Errored = "errored"
}
export interface TrackedSearch<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
    state: TrackedSearchState;
    searchDescriptor: SearchDescriptor;
    searchMeta: SearchMeta;
}
/**
 * Internal state of SessionService
 * {@link SearchSessionState} is inferred from this state
 *
 * @internal
 */
export interface SessionStateInternal<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
    /**
     * Current session Id
     * Empty means there is no current active session.
     */
    sessionId?: string;
    /**
     * App that created this session
     */
    appName?: string;
    /**
     * Is the session in the process of being saved?
     */
    isSaving: boolean;
    /**
     * Has the session already been stored (i.e. "sent to background")?
     */
    isStored: boolean;
    /**
     * Saved object of a current search session
     */
    searchSessionSavedObject?: SearchSessionSavedObject;
    /**
     * Is this session a restored session (have these requests already been made, and we're just
     * looking to re-use the previous search IDs)?
     */
    isRestore: boolean;
    /**
     * Set of all searches within a session and any info associated with them
     */
    trackedSearches: Array<TrackedSearch<SearchDescriptor, SearchMeta>>;
    /**
     * There was at least a single search in this session
     */
    isStarted: boolean;
    /**
     * If user has explicitly canceled search requests
     */
    isCanceled: boolean;
    /**
     * If session was continued from a different app,
     * If session continued from a different app, then it is very likely that `trackedSearches`
     * doesn't have all the search that were included into the session.
     * Session that was continued can't be saved because we can't guarantee all the searches saved.
     * This limitation should be fixed in https://github.com/elastic/kibana/issues/121543
     *
     * @deprecated - https://github.com/elastic/kibana/issues/121543
     */
    isContinued: boolean;
    /**
     * Start time of the current session (from browser perspective)
     */
    startTime?: Date;
    /**
     * Time when all the searches from the current session are completed (from browser perspective)
     */
    completedTime?: Date;
    /**
     * Time when the session was canceled by user, by hitting "stop"
     */
    canceledTime?: Date;
}
export interface SessionPureTransitions<SearchDescriptor = unknown, SearchMeta extends {} = {}, S = SessionStateInternal<SearchDescriptor, SearchMeta>> {
    start: (state: S) => ({ appName }: {
        appName: string;
    }) => S;
    restore: (state: S) => (sessionId: string) => S;
    clear: (state: S) => () => S;
    save: (state: S) => () => S;
    store: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
    trackSearch: (state: S) => (search: SearchDescriptor, meta?: SearchMeta) => S;
    removeSearch: (state: S) => (search: SearchDescriptor) => S;
    completeSearch: (state: S) => (search: SearchDescriptor) => S;
    errorSearch: (state: S) => (search: SearchDescriptor) => S;
    updateSearchMeta: (state: S) => (search: SearchDescriptor, meta: Partial<SearchMeta>) => S;
    cancel: (state: S) => () => S;
    setSearchSessionSavedObject: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
}
export declare const sessionPureTransitions: SessionPureTransitions;
/**
 * Consolidate meta info about current seach session
 * Contains both deferred properties and plain properties from state
 */
export interface SessionMeta {
    state: SearchSessionState;
    name?: string;
    startTime?: Date;
    canceledTime?: Date;
    completedTime?: Date;
    /**
     * @deprecated - see remarks in {@link SessionStateInternal}
     */
    isContinued: boolean;
}
export interface SessionPureSelectors<SearchDescriptor = unknown, SearchMeta extends {} = {}, S = SessionStateInternal<SearchDescriptor, SearchMeta>> {
    getState: (state: S) => () => SearchSessionState;
    getMeta: (state: S) => () => SessionMeta;
    getSearch: (state: S) => (search: SearchDescriptor) => TrackedSearch<SearchDescriptor, SearchMeta> | null;
}
export declare const sessionPureSelectors: SessionPureSelectors;
export type SessionStateContainer<SearchDescriptor = unknown, SearchMeta extends {} = {}> = StateContainer<SessionStateInternal<SearchDescriptor, SearchMeta>, SessionPureTransitions<SearchDescriptor, SearchMeta>, SessionPureSelectors<SearchDescriptor, SearchMeta>>;
export declare const createSessionStateContainer: <SearchDescriptor = unknown, SearchMeta extends {} = {}>({ freeze }?: {
    freeze: boolean;
}) => {
    stateContainer: SessionStateContainer<SearchDescriptor, SearchMeta>;
    sessionState$: Observable<SearchSessionState>;
    sessionMeta$: Observable<SessionMeta>;
};
