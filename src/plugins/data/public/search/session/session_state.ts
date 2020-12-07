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

import uuid from 'uuid';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createStateContainer, StateContainer } from '../../../../kibana_utils/public';

/**
 * Possible state that current session can be in
 *
 * @public
 */
export enum SessionState {
  /**
   * Session is not active, e.g. didn't start
   */
  None = 'none',

  /**
   * Pending search request has not been sent to the background yet
   */
  Loading = 'loading',

  /**
   * No action was taken and the page completed loading without background session creation.
   */
  Completed = 'completed',

  /**
   * Search request was sent to the background.
   * The page is loading in background.
   */
  BackgroundLoading = 'backgroundLoading',

  /**
   * Page load completed with background session created.
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
 * {@link SessionState} is inferred from this state
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
   * Has the session already been stored (i.e. "sent to background")?
   */
  isStored: boolean;

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
}

const createSessionDefaultState: <
  SearchDescriptor = unknown
>() => SessionStateInternal<SearchDescriptor> = () => ({
  sessionId: undefined,
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
  start: (state: S) => () => S;
  restore: (state: S) => (sessionId: string) => S;
  clear: (state: S) => () => S;
  store: (state: S) => () => S;
  trackSearch: (state: S) => (search: SearchDescriptor) => S;
  unTrackSearch: (state: S) => (search: SearchDescriptor) => S;
  cancel: (state: S) => () => S;
}

export const sessionPureTransitions: SessionPureTransitions = {
  start: (state) => () => ({ ...createSessionDefaultState(), sessionId: uuid.v4() }),
  restore: (state) => (sessionId: string) => ({
    ...createSessionDefaultState(),
    sessionId,
    isRestore: true,
    isStored: true,
  }),
  clear: (state) => () => createSessionDefaultState(),
  store: (state) => () => {
    if (!state.sessionId) throw new Error("Can't store session. Missing sessionId");
    if (state.isStored || state.isRestore)
      throw new Error('Can\'t store because current session is already stored"');
    return {
      ...state,
      isStored: true,
    };
  },
  trackSearch: (state) => (search) => {
    if (!state.sessionId) throw new Error("Can't track search. Missing sessionId");
    return {
      ...state,
      isStarted: true,
      pendingSearches: state.pendingSearches.concat(search),
    };
  },
  unTrackSearch: (state) => (search) => {
    return {
      ...state,
      pendingSearches: state.pendingSearches.filter((s) => s !== search),
    };
  },
  cancel: (state) => () => {
    if (!state.sessionId) throw new Error("Can't cancel searches. Missing sessionId");
    if (state.isRestore) throw new Error("Can't cancel searches when restoring older searches");
    return {
      ...state,
      pendingSearches: [],
      isCanceled: true,
      isStored: false,
    };
  },
};

export interface SessionPureSelectors<
  SearchDescriptor = unknown,
  S = SessionStateInternal<SearchDescriptor>
> {
  getState: (state: S) => () => SessionState;
}

export const sessionPureSelectors: SessionPureSelectors = {
  getState: (state) => () => {
    if (!state.sessionId) return SessionState.None;
    if (!state.isStarted) return SessionState.None;
    if (state.isCanceled) return SessionState.Canceled;
    switch (true) {
      case state.isRestore:
        return state.pendingSearches.length > 0
          ? SessionState.BackgroundLoading
          : SessionState.Restored;
      case state.isStored:
        return state.pendingSearches.length > 0
          ? SessionState.BackgroundLoading
          : SessionState.BackgroundCompleted;
      default:
        return state.pendingSearches.length > 0 ? SessionState.Loading : SessionState.Completed;
    }
    return SessionState.None;
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
  sessionState$: Observable<SessionState>;
} => {
  const stateContainer = createStateContainer(
    createSessionDefaultState(),
    sessionPureTransitions,
    sessionPureSelectors,
    freeze ? undefined : { freeze: (s) => s }
  ) as SessionStateContainer<SearchDescriptor>;

  const sessionState$: Observable<SessionState> = stateContainer.state$.pipe(
    map(() => stateContainer.selectors.getState()),
    distinctUntilChanged(),
    shareReplay(1)
  );
  return {
    stateContainer,
    sessionState$,
  };
};
