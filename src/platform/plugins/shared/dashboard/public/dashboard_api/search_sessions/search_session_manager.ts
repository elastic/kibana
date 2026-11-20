/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';

import { getDashboardBackupService } from '../../services/dashboard_api_services';
import {
  DASHBOARD_PANELS_UNSAVED_ID,
  getReplayCacheAssetId,
} from '../../services/dashboard_backup_service';
import { dataService } from '../../services/kibana_services';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from '../types';
import { getReplayCacheContextKey } from './get_replay_cache_context_key';
import { startDashboardSearchSessionIntegration } from './start_dashboard_search_session_integration';

export function initializeSearchSessionManager(
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  dashboardApi: Omit<DashboardApi, 'searchSessionId$' | 'replayCacheLastFetched$'>,
  dashboardInternalApi: DashboardInternalApi,
  skipReplay = false
) {
  const searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);
  const replayCacheLastFetched$ = new BehaviorSubject<string | undefined>(undefined);
  const searchSessionGenerationInProgress$ = new BehaviorSubject<boolean>(false);
  const { replayCache, search, query } = dataService;
  const { session } = search;
  const { timefilter } = query.timefilter;

  const getAssetId = () => getReplayCacheAssetId(dashboardApi.savedObjectId$.value);

  const getContextKey = () =>
    getReplayCacheContextKey({
      timeRange: dashboardApi.timeRange$.value,
      pinnedFilters: query.filterManager.getGlobalFilters(),
      projectRouting: dashboardApi.projectRouting$?.value,
    });

  const registerSearchSession = (sessionId: string) => {
    const timeRange = session.resolveTimeRange(
      dashboardApi.timeRange$.value ?? timefilter.getTime()
    );
    replayCache.set(getAssetId(), {
      sessionId,
      timeRange: { ...timeRange, mode: 'absolute' },
      contextKey: getContextKey(),
    });
  };

  // Starts a new session and registers it, so the next visit can replay it.
  const startSearchSession = () => {
    const sessionId = session.start();
    replayCacheLastFetched$.next(undefined);
    registerSearchSession(sessionId);

    return sessionId;
  };

  const unregisterSearchSession = () => replayCache.delete(getAssetId());

  // Restored background searches are never replayed, so the registration goes away.
  const restoreSearchSession = (sessionId: string) => {
    session.restore(sessionId);
    unregisterSearchSession();
    replayCacheLastFetched$.next(undefined);
  };

  // First match wins: background restore, the session an editor returns, a new session when
  // navigation changed the search, a compatible cached session, otherwise a new one.
  const getInitialSearchSessionId = (sessionIdToRestore?: string) => {
    if (sessionIdToRestore) {
      restoreSearchSession(sessionIdToRestore);

      return sessionIdToRestore;
    }

    for (const { searchSessionId } of incomingEmbeddables ?? []) {
      if (searchSessionId && !session.isCurrentSession(searchSessionId)) {
        session.continue(searchSessionId);
      }
    }

    const continuedSessionId = incomingEmbeddables?.length ? session.getSessionId() : undefined;
    if (skipReplay && !continuedSessionId) {
      return startSearchSession();
    }

    // Every draft shares the unsaved id: a brand-new dashboard must not replay an earlier draft.
    const isNewDraft =
      dashboardApi.savedObjectId$.value === undefined &&
      getDashboardBackupService().getState(DASHBOARD_PANELS_UNSAVED_ID) === undefined;
    const replay = isNewDraft
      ? { hit: false as const }
      : replayCache.get(getAssetId(), getContextKey());

    if (continuedSessionId) {
      // Returning from an editor continues the session it used. If that session is the
      // registered one, registering it again would evict the responses we are about to reuse.
      if (replay.hit && replay.sessionId === continuedSessionId) {
        replayCacheLastFetched$.next(replay.lastFetched);
      } else {
        registerSearchSession(continuedSessionId);
      }

      return continuedSessionId;
    }

    if (replay.hit) {
      if (!session.isCurrentSession(replay.sessionId)) {
        session.continue(replay.sessionId);
      }

      replayCacheLastFetched$.next(replay.lastFetched);

      return replay.sessionId;
    }

    return startSearchSession();
  };

  let stopSearchSessionIntegration: (() => void) | undefined;
  let requestSearchSessionId: (() => Promise<string | undefined>) | undefined;
  if (searchSessionSettings) {
    const api = { ...dashboardApi, searchSessionId$, replayCacheLastFetched$ };
    stopSearchSessionIntegration = startDashboardSearchSessionIntegration(
      api,
      dashboardInternalApi,
      searchSessionSettings,
      (searchSessionId: string) => searchSessionId$.next(searchSessionId),
      searchSessionGenerationInProgress$,
      startSearchSession,
      restoreSearchSession
    );

    searchSessionId$.next(getInitialSearchSessionId(searchSessionSettings.sessionIdToRestore));

    // `requestSearchSessionId` should be used when you need to ensure that you have the up-to-date search session ID
    requestSearchSessionId = async () => {
      if (!searchSessionGenerationInProgress$.getValue()) return searchSessionId$.getValue();
      return new Promise((resolve) => {
        const subscription = searchSessionGenerationInProgress$.subscribe((inProgress) => {
          if (!inProgress) {
            resolve(searchSessionId$.getValue());
            subscription.unsubscribe();
          }
        });
      });
    };
  }
  return {
    api: {
      searchSessionId$,
      replayCacheLastFetched$,
      requestSearchSessionId,
      asyncResetToLastSavedState: async () => {
        unregisterSearchSession();
        await dashboardApi.asyncResetToLastSavedState();
      },
      cancelAllRequests: () => {
        unregisterSearchSession();
        dashboardApi.cancelAllRequests();
      },
    },
    cleanup: () => {
      stopSearchSessionIntegration?.();
    },
  };
}
