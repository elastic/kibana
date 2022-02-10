/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicContract, SerializableRecord } from '@kbn/utility-types';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import {
  PluginInitializerContext,
  StartServicesAccessor,
  ToastsStart as ToastService,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ConfigSchema } from '../../../config';
import { createSessionStateContainer } from './search_session_state';
import type {
  SearchSessionState,
  SessionMeta,
  SessionStateContainer,
  SessionStateInternal,
} from './search_session_state';
import { ISessionsClient } from './sessions_client';
import { ISearchOptions } from '../../../common';
import { NowProviderInternalContract } from '../../now_provider';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { formatSessionName } from './lib/session_name_formatter';

export type ISessionService = PublicContract<SessionService>;

interface TrackSearchDescriptor {
  abort: () => void;
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
  private readonly state: SessionStateContainer<TrackSearchDescriptor>;

  public readonly sessionMeta$: Observable<SessionMeta>;
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
    { freezeState = true }: { freezeState: boolean } = { freezeState: true }
  ) {
    const { stateContainer, sessionState$, sessionMeta$ } =
      createSessionStateContainer<TrackSearchDescriptor>({
        freeze: freezeState,
      });
    this.state$ = sessionState$;
    this.state = stateContainer;
    this.sessionMeta$ = sessionMeta$;

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
   * Used to track pending searches within current session
   *
   * @param searchDescriptor - uniq object that will be used to untrack the search
   * @returns untrack function
   */
  public trackSearch(searchDescriptor: TrackSearchDescriptor): () => void {
    this.state.transitions.trackSearch(searchDescriptor);
    return () => {
      this.state.transitions.unTrackSearch(searchDescriptor);
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
        pendingSearches: [],
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
    const isStoredSession = this.state.get().isStored;
    this.state.get().pendingSearches.forEach((s) => {
      s.abort();
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
    if (this.getSessionId() === sessionId) {
      this.state.transitions.store(searchSessionSavedObject);
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
