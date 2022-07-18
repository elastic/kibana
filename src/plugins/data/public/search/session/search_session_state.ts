/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import deepEqual from 'fast-deep-equal';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createStateContainer, StateContainer } from '@kbn/kibana-utils-plugin/public';
import type { SearchSessionSavedObject } from './sessions_client';

/**
 * Possible state that current session can be in
 *
 * @public
 */
export enum SearchSessionState {
  /**
   * Session is not active, e.g. didn't start
   */
  None = 'none',

  /**
   * Pending search request has not been sent to the background yet
   */
  Loading = 'loading',

  /**
   * No action was taken and the page completed loading without search session creation.
   */
  Completed = 'completed',

  /**
   * Search session was sent to the background.
   * The page is loading in background.
   */
  BackgroundLoading = 'backgroundLoading',

  /**
   * Page load completed with search session created.
   */
  BackgroundCompleted = 'backgroundCompleted',

  /**
   * Revisiting the page after background completion
   */
  Restored = 'restored',

  /**
   * Current session requests where explicitly canceled by user
   * Displaying none or partial results
   */
  Canceled = 'canceled',
}

/**
 * Internal state of SessionService
 * {@link SearchSessionState} is inferred from this state
 *
 * @private
 */
export interface SessionStateInternal<SearchDescriptor = unknown> {
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
   * Set of currently running searches
   * within a session and any info associated with them
   */
  pendingSearches: SearchDescriptor[];

  /**
   * There was at least a single search in this session
   */
  isStarted: boolean;

  /**
   * If user has explicitly canceled search requests
   */
  isCanceled: boolean;

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

const createSessionDefaultState: <
  SearchDescriptor = unknown
>() => SessionStateInternal<SearchDescriptor> = () => ({
  sessionId: undefined,
  appName: undefined,
  isStored: false,
  isRestore: false,
  isCanceled: false,
  isStarted: false,
  pendingSearches: [],
});

export interface SessionPureTransitions<
  SearchDescriptor = unknown,
  S = SessionStateInternal<SearchDescriptor>
> {
  start: (state: S) => ({ appName }: { appName: string }) => S;
  restore: (state: S) => (sessionId: string) => S;
  clear: (state: S) => () => S;
  store: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
  trackSearch: (state: S) => (search: SearchDescriptor) => S;
  unTrackSearch: (state: S) => (search: SearchDescriptor) => S;
  cancel: (state: S) => () => S;
  setSearchSessionSavedObject: (
    state: S
  ) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
}

export const sessionPureTransitions: SessionPureTransitions = {
  start:
    (state) =>
    ({ appName }) => ({
      ...createSessionDefaultState(),
      sessionId: uuid.v4(),
      startTime: new Date(),
      appName,
    }),
  restore: (state) => (sessionId: string) => ({
    ...createSessionDefaultState(),
    sessionId,
    isRestore: true,
    isStored: true,
  }),
  clear: (state) => () => createSessionDefaultState(),
  store: (state) => (searchSessionSavedObject: SearchSessionSavedObject) => {
    if (!state.sessionId) throw new Error("Can't store session. Missing sessionId");
    if (state.isStored || state.isRestore)
      throw new Error('Can\'t store because current session is already stored"');
    return {
      ...state,
      isStored: true,
      searchSessionSavedObject,
    };
  },
  trackSearch: (state) => (search) => {
    if (!state.sessionId) throw new Error("Can't track search. Missing sessionId");
    return {
      ...state,
      isStarted: true,
      pendingSearches: state.pendingSearches.concat(search),
      completedTime: undefined,
    };
  },
  unTrackSearch: (state) => (search) => {
    const pendingSearches = state.pendingSearches.filter((s) => s !== search);
    return {
      ...state,
      pendingSearches,
      completedTime: pendingSearches.length === 0 ? new Date() : state.completedTime,
    };
  },
  cancel: (state) => () => {
    if (!state.sessionId) throw new Error("Can't cancel searches. Missing sessionId");
    if (state.isRestore) throw new Error("Can't cancel searches when restoring older searches");
    return {
      ...state,
      pendingSearches: [],
      isCanceled: true,
      canceledTime: new Date(),
      isStored: false,
      searchSessionSavedObject: undefined,
    };
  },
  setSearchSessionSavedObject: (state) => (searchSessionSavedObject: SearchSessionSavedObject) => {
    if (!state.sessionId)
      throw new Error(
        "Can't add search session saved object session into the state. Missing sessionId"
      );
    if (state.sessionId !== searchSessionSavedObject.attributes.sessionId)
      throw new Error(
        "Can't add search session saved object session into the state. SessionIds don't match."
      );
    return {
      ...state,
      searchSessionSavedObject,
    };
  },
};

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
}

export interface SessionPureSelectors<
  SearchDescriptor = unknown,
  S = SessionStateInternal<SearchDescriptor>
> {
  getState: (state: S) => () => SearchSessionState;
  getMeta: (state: S) => () => SessionMeta;
}

export const sessionPureSelectors: SessionPureSelectors = {
  getState: (state) => () => {
    if (!state.sessionId) return SearchSessionState.None;
    if (!state.isStarted) return SearchSessionState.None;
    if (state.isCanceled) return SearchSessionState.Canceled;
    switch (true) {
      case state.isRestore:
        return state.pendingSearches.length > 0
          ? SearchSessionState.BackgroundLoading
          : SearchSessionState.Restored;
      case state.isStored:
        return state.pendingSearches.length > 0
          ? SearchSessionState.BackgroundLoading
          : SearchSessionState.BackgroundCompleted;
      default:
        return state.pendingSearches.length > 0
          ? SearchSessionState.Loading
          : SearchSessionState.Completed;
    }
    return SearchSessionState.None;
  },
  getMeta(state) {
    const sessionState = this.getState(state)();

    return () => ({
      state: sessionState,
      name: state.searchSessionSavedObject?.attributes.name,
      startTime: state.searchSessionSavedObject?.attributes.created
        ? new Date(state.searchSessionSavedObject?.attributes.created)
        : state.startTime,
      completedTime: state.searchSessionSavedObject?.attributes.completed
        ? new Date(state.searchSessionSavedObject?.attributes.completed)
        : state.completedTime,
      canceledTime: state.canceledTime,
    });
  },
};

export type SessionStateContainer<SearchDescriptor = unknown> = StateContainer<
  SessionStateInternal<SearchDescriptor>,
  SessionPureTransitions<SearchDescriptor>,
  SessionPureSelectors<SearchDescriptor>
>;

export const createSessionStateContainer = <SearchDescriptor = unknown>(
  { freeze = true }: { freeze: boolean } = { freeze: true }
): {
  stateContainer: SessionStateContainer<SearchDescriptor>;
  sessionState$: Observable<SearchSessionState>;
  sessionMeta$: Observable<SessionMeta>;
} => {
  const stateContainer = createStateContainer(
    createSessionDefaultState(),
    sessionPureTransitions,
    sessionPureSelectors,
    freeze ? undefined : { freeze: (s) => s }
  ) as SessionStateContainer<SearchDescriptor>;

  const sessionMeta$: Observable<SessionMeta> = stateContainer.state$.pipe(
    map(() => stateContainer.selectors.getMeta()),
    distinctUntilChanged(deepEqual),
    shareReplay(1)
  );

  const sessionState$: Observable<SearchSessionState> = sessionMeta$.pipe(
    map((meta) => meta.state),
    distinctUntilChanged()
  );

  return {
    stateContainer,
    sessionState$,
    sessionMeta$,
  };
};
