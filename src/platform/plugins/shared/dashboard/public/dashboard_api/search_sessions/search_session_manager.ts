/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable, type Subscription } from 'rxjs';

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';

import { dataService } from '../../services/kibana_services';
import { dashboardCacheService } from '../../services/dashboard_cache_service';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from '../types';
import { startDashboardSearchSessionIntegration } from './start_dashboard_search_session_integration';

export function initializeSearchSessionManager(
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  dashboardApi: Omit<DashboardApi, 'searchSessionId$'>,
  dashboardInternalApi: DashboardInternalApi,
  waitForPanelsToLoad$?: Observable<void>
) {
  const searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);
  const searchSessionGenerationInProgress$ = new BehaviorSubject<boolean>(false);

  let stopSearchSessionIntegration: (() => void) | undefined;
  let requestSearchSessionId: (() => Promise<string | undefined>) | undefined;
  let revalidationSubscription: Subscription | undefined;
  if (searchSessionSettings) {
    stopSearchSessionIntegration = startDashboardSearchSessionIntegration(
      {
        ...dashboardApi,
        searchSessionId$,
      },
      dashboardInternalApi,
      searchSessionSettings,
      (searchSessionId: string) => searchSessionId$.next(searchSessionId),
      searchSessionGenerationInProgress$
    );

    const { sessionIdToRestore, cachedSessionId } = searchSessionSettings;

    // if this incoming embeddable has a session, continue it.
    incomingEmbeddables?.forEach((embeddablePackage) => {
      if (embeddablePackage.searchSessionId) {
        dataService.search.session.continue(embeddablePackage.searchSessionId);
      }
    });
    if (sessionIdToRestore) {
      dataService.search.session.restore(sessionIdToRestore);
    } else if (cachedSessionId) {
      // Use `continue` (not `restore`) to avoid setting isRestore=true which would
      // bypass the client-side response cache.
      dataService.search.session.continue(cachedSessionId);
    }
    const existingSession = dataService.search.session.getSessionId();

    const initialSearchSessionId =
      sessionIdToRestore ??
      cachedSessionId ??
      (existingSession && incomingEmbeddables?.length
        ? existingSession
        : dataService.search.session.start());
    searchSessionId$.next(initialSearchSessionId);

    // Store fresh sessions in the cache so subsequent reopens can reuse the session.
    // Skip when restoring from URL or continuing from cache (those already have the right state).
    if (!sessionIdToRestore && !cachedSessionId && initialSearchSessionId) {
      const dashboardId = dashboardApi.savedObjectId$.getValue();
      if (dashboardId) {
        const currentTimeRange = dashboardApi.timeRange$.getValue();
        if (currentTimeRange) {
          dashboardCacheService.setCacheEntry(dashboardId, {
            sessionId: initialSearchSessionId,
            absoluteTimeRange: getAbsoluteTimeRange(currentTimeRange),
          });
        }
      }
    }

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

    // After a cache hit renders, trigger a new session so panels fetch fresh data.
    if (cachedSessionId && waitForPanelsToLoad$) {
      revalidationSubscription = waitForPanelsToLoad$.subscribe(() => {
        const scheduleRevalidation: (cb: () => void) => void =
          typeof window.requestIdleCallback === 'function'
            ? (cb) => window.requestIdleCallback(cb)
            : (cb) => setTimeout(cb, 50);

        scheduleRevalidation(() => {
          dashboardApi.forceRefresh();
        });
      });
    }
  }
  return {
    api: {
      searchSessionId$,
      requestSearchSessionId,
    },
    cleanup: () => {
      stopSearchSessionIntegration?.();
      revalidationSubscription?.unsubscribe();
    },
  };
}
