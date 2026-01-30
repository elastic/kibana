/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicContract, SerializableRecord } from '@kbn/utility-types';
import {
  EMPTY,
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  from,
  map,
  mergeMap,
  type Observable,
  repeat,
  startWith,
  Subscription,
  switchMap,
  take,
  takeUntil,
  timer,
} from 'rxjs';
import type {
  PluginInitializerContext,
  StartServicesAccessor,
  ToastsStart as ToastService,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { IKibanaSearchResponse, ISearchOptions } from '@kbn/search-types';
import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { ConfigSchema } from '../../../server/config';
import type { SessionMeta, SessionStateContainer } from './search_session_state';
import {
  createSessionStateContainer,
  SearchSessionState,
  TrackedSearchState,
} from './search_session_state';
import type { ISessionsClient } from './sessions_client';
import type { NowProviderInternalContract } from '../../now_provider';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { formatSessionName } from './lib/session_name_formatter';
import type { ISearchSessionEBTManager } from './ebt_manager';

/**
 * Polling interval for keeping completed searches alive
 * until the user saves the session
 */
const KEEP_ALIVE_COMPLETED_SEARCHES_INTERVAL = 30_000;

/**
 * To prevent the session ids map from growing indefinitely we can use an LRU cache - we will limit it to 30 sessions for
 * now given that there can be 25 tabs opened at the same time (see src/platform/packages/shared/kbn-unified-tabs/src/constants.ts)
 * and we want to make room for the other apps that may use background search.
 */
const LRU_OPTIONS = {
  max: 30,
  ttl: 1000 * 60 * 60, // 1 hour TTL
};

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
  onSavingSession?: (
    options: Required<Pick<ISearchOptions, 'sessionId' | 'isRestore' | 'isStored'>>
  ) => Promise<void>;
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
    currentSearchState: { isSearchStored: boolean },
    afterPoll: (newSearchState: { isSearchStored: boolean }) => void
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
  isDisabled: () => { disabled: true; reasonText: string } | { disabled: false };
}

/**
 * Responsible for tracking a current search session. Supports a single session at a time.
 */
export class SessionService {
  public readonly state$: Observable<SearchSessionState>;
  private readonly state: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>;

  public readonly sessionMeta$: Observable<SessionMeta>;

  private searchSessionInfoProvider?: SearchSessionInfoProvider;
  private searchSessionIndicatorUiConfig?: Partial<SearchSessionIndicatorUiConfig>;
  private subscription = new Subscription();
  private currentApp?: string;
  private hasAccessToSearchSessions: boolean = false;

  private toastService?: ToastService;
  private searchSessionEBTManager?: ISearchSessionEBTManager;

  private sessionSnapshots: LRUCache<string, SessionSnapshot>;
  private logger: Logger;

  constructor(
    initializerContext: PluginInitializerContext<ConfigSchema>,
    getStartServices: StartServicesAccessor,
    searchSessionEBTManager: ISearchSessionEBTManager,
    private readonly sessionsClient: ISessionsClient,
    private readonly nowProvider: NowProviderInternalContract,
    { freezeState = true }: { freezeState: boolean } = { freezeState: true }
  ) {
    const { stateContainer, sessionState$, sessionMeta$ } = createSessionStateContainer<
      TrackSearchDescriptor,
      TrackSearchMeta
    >({
      freeze: freezeState,
    });
    this.state$ = sessionState$;
    this.state = stateContainer;
    this.sessionMeta$ = sessionMeta$;
    this.searchSessionEBTManager = searchSessionEBTManager;

    this.sessionSnapshots = new LRUCache<string, SessionSnapshot>(LRU_OPTIONS);
    this.logger = initializerContext.logger.get();

    this.subscription.add(
      sessionMeta$
        .pipe(
          map((meta) => meta.startTime),
          distinctUntilChanged()
        )
        .subscribe((startTime) => {
          if (startTime) this.nowProvider.set(startTime);
          else this.nowProvider.reset();
        })
    );

    getStartServices().then(([coreStart]) => {
      // using management?.kibana? we infer if any of the apps allows current user to store sessions
      this.hasAccessToSearchSessions =
        coreStart.application.capabilities.management?.kibana?.[SEARCH_SESSIONS_MANAGEMENT_ID];

      this.toastService = coreStart.notifications.toasts;

      this.subscription.add(
        coreStart.application.currentAppId$.subscribe((newAppName) => {
          this.currentApp = newAppName;
          if (!this.getSessionId()) return;

          // Apps required to clean up their sessions before unmounting
          // Make sure that apps don't leave sessions open by throwing an error in DEV mode
          const message = `Application '${
            this.state.get().appName
          }' had an open session while navigating`;
          if (initializerContext.env.mode.dev) {
            coreStart.fatalErrors.add(message);
          } else {
            // this should never happen in prod because should be caught in dev mode
            // in case this happen we don't want to throw fatal error, as most likely possible bugs are not that critical
            // eslint-disable-next-line no-console
            console.warn(message);
          }
        })
      );
    });

    // keep completed searches alive until user explicitly saves the session
    this.subscription.add(
      this.getSession$()
        .pipe(
          switchMap((sessionId) => {
            if (!sessionId) return EMPTY;
            if (this.isStored()) return EMPTY; // no need to keep searches alive because session and searches are already stored
            if (!this.hasAccess()) return EMPTY; // don't need to keep searches alive if the user can't save session
            if (!this.isSessionStorageReady()) return EMPTY; // don't need to keep searches alive if app doesn't allow saving session

            const finishedStates = [
              SearchSessionState.Completed,
              SearchSessionState.BackgroundCompleted,
              SearchSessionState.Canceled,
            ];

            const stopOnFinishedState$ = this.state$.pipe(
              filter((state) => finishedStates.includes(state)),
              take(1)
            );
            const pollingError$ = new BehaviorSubject<boolean>(false);

            const schedulePollSearches = () => {
              return timer(KEEP_ALIVE_COMPLETED_SEARCHES_INTERVAL).pipe(
                mergeMap(() => {
                  const searchesToKeepAlive = this.state.get().trackedSearches.filter(
                    (s) =>
                      !s.searchMeta.isStored &&
                      s.state === TrackedSearchState.Completed &&
                      s.searchMeta.lastPollingTime.getTime() < Date.now() - 5000 // don't poll if was very recently polled
                  );

                  return from(
                    Promise.all(
                      searchesToKeepAlive.map((s) =>
                        s.searchDescriptor.poll().catch((e) => {
                          // eslint-disable-next-line no-console
                          console.warn(
                            `Error while polling search to keep it alive. Considering that it is no longer possible to extend a session.`,
                            e
                          );
                          if (this.isCurrentSession(sessionId)) {
                            pollingError$.next(true);
                          }
                        })
                      )
                    )
                  );
                }),
                repeat(),
                takeUntil(pollingError$.pipe(filter(Boolean))),
                takeUntil(stopOnFinishedState$)
              );
            };

            return schedulePollSearches();
          })
        )
        .subscribe(() => {})
    );
  }

  /**
   * If user has access to search sessions
   * This resolves to `true` in case at least one app allows user to create search session
   * In this case search session management is available
   */
  public hasAccess() {
    return this.hasAccessToSearchSessions;
  }

  /**
   * Used to track searches within current session
   *
   * @param searchDescriptor - uniq object that will be used to as search identifier
   * @returns {@link TrackSearchHandler}
   */
  public trackSearch(searchDescriptor: TrackSearchDescriptor): TrackSearchHandler {
    const sessionId = this.getSessionId();

    this.state.transitions.trackSearch(searchDescriptor, {
      lastPollingTime: new Date(),
      isStored: false,
    });

    return {
      complete: () => {
        const state = this.isCurrentSession(sessionId)
          ? this.state
          : this.sessionSnapshots.get(sessionId!);
        if (!state) {
          this.logger.error(
            `SearchSessionService trackSearch complete: sessionId not found: "${sessionId}"`
          );
          return;
        }

        state.transitions.completeSearch(searchDescriptor);

        // when search completes and session has just been saved,
        // trigger polling once again to save search into a session and extend its keep_alive
        if (this.isStored(state)) {
          const search = state.selectors.getSearch(searchDescriptor);
          if (search && !search.searchMeta.isStored) {
            search.searchDescriptor.poll().catch((e) => {
              // eslint-disable-next-line no-console
              console.warn(`Failed to extend search after it was completed`, e);
            });
          }
        }
      },
      error: () => {
        const state = this.isCurrentSession(sessionId)
          ? this.state
          : this.sessionSnapshots.get(sessionId!);
        if (!state) {
          this.logger.error(
            `SearchSessionService trackSearch error: sessionId not found: "${sessionId}"`
          );
          return;
        }

        state.transitions.errorSearch(searchDescriptor);
      },
      beforePoll: () => {
        const state = this.isCurrentSession(sessionId)
          ? this.state
          : this.sessionSnapshots.get(sessionId!);

        const search = state?.selectors.getSearch(searchDescriptor);
        state?.transitions.updateSearchMeta(searchDescriptor, {
          lastPollingTime: new Date(),
        });

        return [
          { isSearchStored: search?.searchMeta?.isStored ?? false },
          ({ isSearchStored }) => {
            state?.transitions.updateSearchMeta(searchDescriptor, {
              isStored: isSearchStored,
            });
          },
        ];
      },
    };
  }

  public destroy() {
    this.subscription.unsubscribe();
    this.clear();
    this.sessionSnapshots = new LRUCache<string, SessionSnapshot>(LRU_OPTIONS);
  }

  /**
   * Get current session id
   */
  public getSessionId() {
    return this.state.get().sessionId;
  }

  /**
   * Get observable for current session id
   */
  public getSession$() {
    return this.state.state$.pipe(
      startWith(this.state.get()),
      map((s) => s.sessionId),
      distinctUntilChanged()
    );
  }

  /**
   * Is current session in process of saving
   */
  public isSaving(
    state: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta> = this.state
  ) {
    return state.get().isSaving;
  }

  /**
   * Is current session already saved as SO (send to background)
   */
  public isStored(
    state: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta> = this.state
  ) {
    return state.get().isStored;
  }

  /**
   * Is restoring the older saved searches
   */
  public isRestore(
    state: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta> = this.state
  ) {
    return state.get().isRestore;
  }

  /**
   * Start a new search session
   * @returns sessionId
   */
  public start() {
    if (!this.currentApp) throw new Error('this.currentApp is missing');

    this.storeSessionSnapshot();

    this.state.transitions.start({ appName: this.currentApp });

    return this.getSessionId()!;
  }

  /**
   * Restore previously saved search session
   * @param sessionId
   */
  public async restore(sessionId: string) {
    this.storeSessionSnapshot();
    this.state.transitions.restore(sessionId);
    await this.refreshSearchSessionSavedObject();
  }

  /**
   * Continue previous search session
   * Can be used to restore all the information of a previous search session after a new one has been started. It is useful
   * to continue a session in different apps or across different discover tabs.
   *
   * This is different from {@link restore} as it reuses search session state and search results held in client memory instead of restoring search results from elasticsearch
   * @param sessionId
   * @param keepSearches indicates if restoring the session also restores the tracked searches or starts with an empty tracking list
   */
  public continue(sessionId: string, keepSearches = false) {
    const sessionSnapshot = this.sessionSnapshots.get(sessionId);
    if (sessionSnapshot) {
      this.storeSessionSnapshot();
      this.state.set({
        ...sessionSnapshot.get(),
        // have to change a name, so that current app can cancel a session that it continues
        appName: this.currentApp,
        // also have to drop all pending searches which are used to derive client side state of search session indicator,
        // if we weren't dropping this searches, then we would get into "infinite loading" state when continuing a session that was cleared with pending searches
        // possible solution to this problem is to refactor session service to support multiple sessions
        trackedSearches: keepSearches ? sessionSnapshot.get().trackedSearches : [],
        isContinued: true,
      });
      this.sessionSnapshots.delete(sessionId);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Unknown ${sessionId} search session id recevied`);
    }
  }

  /**
   * Resets the current search session state.
   * Can be used to reset to a default state without clearing initialization info, such as when switching between discover tabs.
   *
   * This is different from {@link clear} as it does not reset initialization info set through {@link enableStorage}.
   */
  public reset() {
    this.storeSessionSnapshot();
    this.state.transitions.clear();
  }

  private storeSessionSnapshot() {
    if (!this.getSessionId()) return;
    const currentState = createSessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>({
      freeze: false,
    });
    currentState.stateContainer.set(this.state.get());
    this.sessionSnapshots.set(this.getSessionId()!, currentState.stateContainer);
  }

  /**
   * Cleans up current state
   */
  public clear() {
    // make sure apps can't clear other apps' sessions
    const currentSessionApp = this.state.get().appName;
    if (currentSessionApp && currentSessionApp !== this.currentApp) {
      // eslint-disable-next-line no-console
      console.warn(
        `Skip clearing session "${this.getSessionId()}" because it belongs to a different app. current: "${
          this.currentApp
        }", owner: "${currentSessionApp}"`
      );
      return;
    }

    this.storeSessionSnapshot();
    this.state.transitions.clear();
    this.searchSessionInfoProvider = undefined;
    this.searchSessionIndicatorUiConfig = undefined;
  }

  /**
   * Request a cancellation of on-going search requests within current session
   */
  public async cancel({ source }: { source: string }): Promise<void> {
    const isStoredSession = this.isStored();
    const state = this.state.get();
    state.trackedSearches
      .filter((s) => s.state === TrackedSearchState.InProgress)
      .forEach((s) => {
        s.searchDescriptor.abort(AbortReason.CANCELED);
      });
    this.state.transitions.cancel();
    if (isStoredSession) {
      const searchSessionSavedObject = state.searchSessionSavedObject;
      if (searchSessionSavedObject) {
        this.searchSessionEBTManager?.trackBgsCancelled({
          session: searchSessionSavedObject,
          cancelSource: source,
        });
      }
      await this.sessionsClient.delete(this.state.get().sessionId!);
    }
  }

  /**
   * Save current session as SO to get back to results later
   * (Send to background)
   */
  public async save(trackingProps: { entryPoint: string }) {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('No current session');
    const currentSessionApp = this.state.get().appName;
    if (!currentSessionApp) throw new Error('No current session app');
    if (!this.hasAccess()) throw new Error('No access to search sessions');
    const currentSessionInfoProvider = this.searchSessionInfoProvider;
    if (!currentSessionInfoProvider) throw new Error('No info provider for current session');

    const [name, { initialState, restoreState, id: locatorId }] = await Promise.all([
      currentSessionInfoProvider.getName(),
      currentSessionInfoProvider.getLocatorData(),
    ]);

    const formattedName = formatSessionName(name, {
      sessionStartTime: this.state.get().startTime,
      appendStartTime: currentSessionInfoProvider.appendSessionStartTimeToName,
    });

    this.state.transitions.save();

    const searchSessionSavedObject = await this.sessionsClient.create({
      name: formattedName,
      appId: currentSessionApp,
      locatorId,
      restoreState,
      initialState,
      sessionId,
    });

    this.searchSessionEBTManager?.trackBgsStarted({
      session: searchSessionSavedObject,
      ...trackingProps,
    });

    // if we are still interested in this result
    if (this.isCurrentSession(sessionId)) {
      this.state.transitions.store(searchSessionSavedObject);

      // trigger a poll for all the searches that are not yet stored to propagate them into newly created search session saved object and extend their keepAlive
      const searchesToExtend = this.state
        .get()
        .trackedSearches.filter(
          (s) => s.state !== TrackedSearchState.Errored && !s.searchMeta.isStored
        );

      const extendSearchesPromise = Promise.all(
        searchesToExtend.map((s) =>
          s.searchDescriptor.poll(new AbortController().signal).catch((e) => {
            // eslint-disable-next-line no-console
            console.warn('Failed to extend search after session was saved', e);
          })
        )
      );

      // notify all the searches with onSavingSession that session has been saved and saved object has been created
      // don't wait for the result
      const searchesWithSavingHandler = this.state
        .get()
        .trackedSearches.filter((s) => s.searchDescriptor.onSavingSession);
      searchesWithSavingHandler.forEach((s) =>
        s.searchDescriptor.onSavingSession!({
          sessionId,
          isRestore: this.isRestore(),
          isStored: this.isStored(),
        }).catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('Failed to execute "onSavingSession" handler after session was saved', e);
        })
      );

      await extendSearchesPromise;
    }

    return searchSessionSavedObject;
  }

  /**
   * Change user-facing name of a current session
   * Doesn't throw in case of API error but presents a notification toast instead
   * @param newName - new session name
   */
  public async renameCurrentSession(newName: string) {
    const sessionId = this.getSessionId();
    if (sessionId && this.state.get().isStored) {
      let renamed = false;
      try {
        await this.sessionsClient.rename(sessionId, newName);
        renamed = true;
      } catch (e) {
        this.toastService?.addError(e, {
          title: i18n.translate(
            'data.searchSessions.sessionService.backgroundSearchEditNameError',
            {
              defaultMessage: 'Failed to edit name of the background search',
            }
          ),
        });
      }

      if (renamed && sessionId === this.getSessionId()) {
        await this.refreshSearchSessionSavedObject();
      }
    }
  }

  /**
   * Checks if passed sessionId is a current sessionId
   * @param sessionId
   */
  public isCurrentSession(sessionId?: string): boolean {
    return !!sessionId && this.getSessionId() === sessionId;
  }

  /**
   * Infers search session options for sessionId using current session state
   *
   * In case user doesn't has access to `search-session` SO returns null,
   * meaning that sessionId and other session parameters shouldn't be used when doing searches
   *
   * @param sessionId
   */
  public getSearchOptions(
    sessionId?: string
  ): Required<Pick<ISearchOptions, 'sessionId' | 'isRestore' | 'isStored'>> | null {
    if (!sessionId) {
      return null;
    }

    // in case user doesn't have permissions to search session, do not forward sessionId to the server
    // because user most likely also doesn't have access to `search-session` SO
    if (!this.hasAccessToSearchSessions) {
      return null;
    }

    const state = this.isCurrentSession(sessionId)
      ? this.state
      : this.sessionSnapshots.get(sessionId);

    return {
      sessionId,
      isRestore: state ? this.isRestore(state) : false,
      isStored: state ? this.isStored(state) : false,
    };
  }

  /**
   * Provide an info about current session which is needed for storing a search session.
   * To opt-into "Search session indicator" UI app has to call {@link enableStorage}.
   *
   * @param searchSessionInfoProvider - info provider for saving a search session
   * @param searchSessionIndicatorUiConfig - config for "Search session indicator" UI
   */
  public enableStorage<P extends SerializableRecord>(
    searchSessionInfoProvider: SearchSessionInfoProvider<P>,
    searchSessionIndicatorUiConfig?: SearchSessionIndicatorUiConfig
  ) {
    this.searchSessionInfoProvider = {
      appendSessionStartTimeToName: true,
      ...searchSessionInfoProvider,
    };
    this.searchSessionIndicatorUiConfig = searchSessionIndicatorUiConfig;
  }

  /**
   * If the current app explicitly called {@link enableStorage} and provided all configuration needed
   * for storing its search sessions
   */
  public isSessionStorageReady(): boolean {
    return !!this.searchSessionInfoProvider;
  }

  public getSearchSessionIndicatorUiConfig(): SearchSessionIndicatorUiConfig {
    return {
      isDisabled: () => ({ disabled: false }),
      ...this.searchSessionIndicatorUiConfig,
    };
  }

  private async refreshSearchSessionSavedObject() {
    const sessionId = this.getSessionId();
    if (sessionId && this.state.get().isStored) {
      try {
        const savedObject = await this.sessionsClient.get(sessionId);
        if (this.getSessionId() === sessionId) {
          // still interested in this result
          this.state.transitions.setSearchSessionSavedObject(savedObject);
        }
        return savedObject;
      } catch (e) {
        this.toastService?.addError(e, {
          title: i18n.translate(
            'data.searchSessions.sessionService.backgroundSearchObjectFetchError',
            {
              defaultMessage: 'Failed to fetch background search info',
            }
          ),
        });
      }
    }
  }
}
