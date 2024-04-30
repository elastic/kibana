/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicContract, SerializableRecord } from '@kbn/utility-types';
import {
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMap,
  repeat,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  from,
  merge,
  Observable,
  of,
  Subscription,
  timer,
} from 'rxjs';
import {
  PluginInitializerContext,
  StartServicesAccessor,
  ToastsStart as ToastService,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { SearchUsageCollector } from '../..';
import { ConfigSchema } from '../../../config';
import type {
  SessionMeta,
  SessionStateContainer,
  SessionStateInternal,
} from './search_session_state';
import {
  createSessionStateContainer,
  SearchSessionState,
  TrackedSearchState,
} from './search_session_state';
import { ISessionsClient } from './sessions_client';
import { ISearchOptions } from '../../../common';
import { NowProviderInternalContract } from '../../now_provider';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { formatSessionName } from './lib/session_name_formatter';

/**
 * Polling interval for keeping completed searches alive
 * until the user saves the session
 */
const KEEP_ALIVE_COMPLETED_SEARCHES_INTERVAL = 30000;

export type ISessionService = PublicContract<SessionService>;

interface TrackSearchDescriptor {
  /**
   * Cancel the search
   */
  abort: () => void;

  /**
   * Keep polling the search to keep it alive
   */
  poll: () => Promise<void>;

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
  complete(): void;

  /**
   * Transition search into "error" status
   */
  error(): void;

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
export type SessionSnapshot = SessionStateInternal<TrackSearchDescriptor>;

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
 * Configure a "Search session indicator" UI
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

  /**
   * Emits `true` when session completes and `config.search.sessions.notTouchedTimeout` duration has passed.
   * Used to stop keeping searches alive after some times and disabled "save session" button
   *
   * or when failed to extend searches after session completes
   */
  private readonly _disableSaveAfterSearchesExpire$ = new BehaviorSubject<boolean>(false);

  /**
   * Emits `true` when it is no longer possible to save a session:
   *   - Failed to keep searches alive after they completed
   *   - `config.search.sessions.notTouchedTimeout` after searches completed hit
   *   - Continued session from a different app and lost information about previous searches (https://github.com/elastic/kibana/issues/121543)
   */
  public readonly disableSaveAfterSearchesExpire$: Observable<boolean>;

  private searchSessionInfoProvider?: SearchSessionInfoProvider;
  private searchSessionIndicatorUiConfig?: Partial<SearchSessionIndicatorUiConfig>;
  private subscription = new Subscription();
  private currentApp?: string;
  private hasAccessToSearchSessions: boolean = false;

  private toastService?: ToastService;

  /**
   * Holds snapshot of last cleared session so that it can be continued
   * Can be used to re-use a session between apps
   * @private
   */
  private lastSessionSnapshot?: SessionSnapshot;

  constructor(
    initializerContext: PluginInitializerContext<ConfigSchema>,
    getStartServices: StartServicesAccessor,
    private readonly sessionsClient: ISessionsClient,
    private readonly nowProvider: NowProviderInternalContract,
    private readonly usageCollector?: SearchUsageCollector,
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

    this.disableSaveAfterSearchesExpire$ = combineLatest([
      this._disableSaveAfterSearchesExpire$,
      this.sessionMeta$.pipe(map((meta) => meta.isContinued)),
    ]).pipe(
      map(
        ([_disableSaveAfterSearchesExpire, isSessionContinued]) =>
          _disableSaveAfterSearchesExpire || isSessionContinued
      ),
      distinctUntilChanged()
    );

    const notTouchedTimeout = moment
      .duration(initializerContext.config.get().search.sessions.notTouchedTimeout)
      .asMilliseconds();

    this.subscription.add(
      this.state$
        .pipe(
          switchMap((_state) =>
            _state === SearchSessionState.Completed
              ? merge(of(false), timer(notTouchedTimeout).pipe(mapTo(true)))
              : of(false)
          ),
          distinctUntilChanged(),
          tap((value) => {
            if (value) this.usageCollector?.trackSessionIndicatorSaveDisabled();
          })
        )
        .subscribe(this._disableSaveAfterSearchesExpire$)
    );

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
                            this._disableSaveAfterSearchesExpire$.next(true);
                          }
                        })
                      )
                    )
                  );
                }),
                repeat(),
                takeUntil(this.disableSaveAfterSearchesExpire$.pipe(filter((disable) => disable)))
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
    this.state.transitions.trackSearch(searchDescriptor, {
      lastPollingTime: new Date(),
      isStored: false,
    });

    return {
      complete: () => {
        this.state.transitions.completeSearch(searchDescriptor);

        // when search completes and session has just been saved,
        // trigger polling once again to save search into a session and extend its keep_alive
        if (this.isStored()) {
          const search = this.state.selectors.getSearch(searchDescriptor);
          if (search && !search.searchMeta.isStored) {
            search.searchDescriptor.poll().catch((e) => {
              // eslint-disable-next-line no-console
              console.warn(`Failed to extend search after it was completed`, e);
            });
          }
        }
      },
      error: () => {
        this.state.transitions.errorSearch(searchDescriptor);
      },
      beforePoll: () => {
        const search = this.state.selectors.getSearch(searchDescriptor);
        this.state.transitions.updateSearchMeta(searchDescriptor, {
          lastPollingTime: new Date(),
        });

        return [
          { isSearchStored: search?.searchMeta?.isStored ?? false },
          ({ isSearchStored }) => {
            this.state.transitions.updateSearchMeta(searchDescriptor, {
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
    this.lastSessionSnapshot = undefined;
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
   * Is current session already saved as SO (send to background)
   */
  public isStored() {
    return this.state.get().isStored;
  }

  /**
   * Is restoring the older saved searches
   */
  public isRestore() {
    return this.state.get().isRestore;
  }

  /**
   * Start a new search session
   * @returns sessionId
   */
  public start() {
    if (!this.currentApp) throw new Error('this.currentApp is missing');

    this.state.transitions.start({ appName: this.currentApp });

    return this.getSessionId()!;
  }

  /**
   * Restore previously saved search session
   * @param sessionId
   */
  public restore(sessionId: string) {
    this.state.transitions.restore(sessionId);
    this.refreshSearchSessionSavedObject();
  }

  /**
   * Continue previous search session
   * Can be used to share a running search session between different apps, so they can reuse search cache
   *
   * This is different from {@link restore} as it reuses search session state and search results held in client memory instead of restoring search results from elasticsearch
   * @param sessionId
   *
   * TODO: remove this functionality in favor of separate architecture for client side search cache
   * that won't interfere with saving search sessions
   * https://github.com/elastic/kibana/issues/121543
   *
   * @deprecated
   */
  public continue(sessionId: string) {
    if (this.lastSessionSnapshot?.sessionId === sessionId) {
      this.state.set({
        ...this.lastSessionSnapshot,
        // have to change a name, so that current app can cancel a session that it continues
        appName: this.currentApp,
        // also have to drop all pending searches which are used to derive client side state of search session indicator,
        // if we weren't dropping this searches, then we would get into "infinite loading" state when continuing a session that was cleared with pending searches
        // possible solution to this problem is to refactor session service to support multiple sessions
        trackedSearches: [],
        isContinued: true,
      });
      this.lastSessionSnapshot = undefined;
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `Continue search session: last known search session id: "${this.lastSessionSnapshot?.sessionId}", but received ${sessionId}`
      );
    }
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

    if (this.getSessionId()) {
      this.lastSessionSnapshot = this.state.get();
    }
    this.state.transitions.clear();
    this.searchSessionInfoProvider = undefined;
    this.searchSessionIndicatorUiConfig = undefined;
  }

  /**
   * Request a cancellation of on-going search requests within current session
   */
  public async cancel(): Promise<void> {
    const isStoredSession = this.isStored();
    this.state
      .get()
      .trackedSearches.filter((s) => s.state === TrackedSearchState.InProgress)
      .forEach((s) => {
        s.searchDescriptor.abort();
      });
    this.state.transitions.cancel();
    if (isStoredSession) {
      await this.sessionsClient.delete(this.state.get().sessionId!);
    }
  }

  /**
   * Save current session as SO to get back to results later
   * (Send to background)
   */
  public async save(): Promise<void> {
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

    const searchSessionSavedObject = await this.sessionsClient.create({
      name: formattedName,
      appId: currentSessionApp,
      locatorId,
      restoreState,
      initialState,
      sessionId,
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
          s.searchDescriptor.poll().catch((e) => {
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
          title: i18n.translate('data.searchSessions.sessionService.sessionEditNameError', {
            defaultMessage: 'Failed to edit name of the search session',
          }),
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

    const isCurrentSession = this.isCurrentSession(sessionId);
    return {
      sessionId,
      isRestore: isCurrentSession ? this.isRestore() : false,
      isStored: isCurrentSession ? this.isStored() : false,
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
      } catch (e) {
        this.toastService?.addError(e, {
          title: i18n.translate('data.searchSessions.sessionService.sessionObjectFetchError', {
            defaultMessage: 'Failed to fetch search session info',
          }),
        });
      }
    }
  }
}
