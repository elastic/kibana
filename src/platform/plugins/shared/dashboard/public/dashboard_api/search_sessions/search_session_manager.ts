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
    if (cachedSessionId) {
      // eslint-disable-next-line no-console
      console.log('[Dashboard cache] return visit — cache hit for this dashboard');
    } else if (!sessionIdToRestore) {
      // eslint-disable-next-line no-console
      console.log('[Dashboard cache] first visit — no cache entry for this dashboard');
    }

    // True when the current time window has moved past the cached snapshot — revalidation needed.
    let timeRangeExceedsCache = false;
    // True when the drift also exceeds 5% of the cached range length (used for 'tolerance' mode).
    let toleranceExceeded = false;
    if (sessionIdToRestore) {
      dataService.search.session.restore(sessionIdToRestore);
    } else if (cachedSessionId) {
      // Compare the current resolved time against the cached absolute time to predict whether
      // ES async search will return cached results or needs to re-fetch.
      const dashboardId = dashboardApi.savedObjectId$.getValue();
      const cachedEntry = dashboardId
        ? dashboardCacheService.getCacheEntry(dashboardId)
        : undefined;
      const currentTimeRange = dashboardApi.timeRange$.getValue();
      if (cachedEntry && currentTimeRange) {
        const resolvedCurrent = getAbsoluteTimeRange(currentTimeRange);
        const cachedFromMs = Date.parse(cachedEntry.absoluteTimeRange.from as string);
        const cachedToMs = Date.parse(cachedEntry.absoluteTimeRange.to as string);
        const currentToMs = Date.parse(resolvedCurrent.to as string);
        const drift = currentToMs - cachedToMs;
        const cachedRangeLength = cachedToMs - cachedFromMs;
        if (drift < 1000) {
          // eslint-disable-next-line no-console
          console.log(
            '[Dashboard cache] time picker time range matches cached time range, expecting cache hit'
          );
        } else {
          timeRangeExceedsCache = true;
          toleranceExceeded = drift > cachedRangeLength * 0.05;
          // eslint-disable-next-line no-console
          console.log(
            '[Dashboard cache] time picker time range exceeds cached time range, will first request cached data and then refresh'
          );
        }
      }
      // eslint-disable-next-line no-console
      console.log('[Dashboard cache] fetching cached data');
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
    // Only revalidate when the time window has moved past the cached snapshot AND
    // the user has not disabled auto-revalidation in the cache settings menu.
    const revalidationMode = dashboardCacheService.getRevalidationMode();
    const shouldRevalidate =
      cachedSessionId &&
      ((revalidationMode === 'always' && timeRangeExceedsCache) ||
        (revalidationMode === 'tolerance' && toleranceExceeded));
    if (cachedSessionId && timeRangeExceedsCache) {
      if (revalidationMode === 'never') {
        // eslint-disable-next-line no-console
        console.log(
          '[Dashboard cache] revalidation disabled by user setting — leaving refresh to user'
        );
      } else if (revalidationMode === 'tolerance' && toleranceExceeded) {
        // eslint-disable-next-line no-console
        console.log('[Dashboard cache] time drift exceeds 5% tolerance — will refresh');
      } else if (revalidationMode === 'tolerance' && !toleranceExceeded) {
        // eslint-disable-next-line no-console
        console.log('[Dashboard cache] time drift within 5% tolerance — skipping refresh');
      }
    }
    if (shouldRevalidate && waitForPanelsToLoad$) {
      revalidationSubscription = waitForPanelsToLoad$.subscribe(() => {
        const scheduleRevalidation: (cb: () => void) => void =
          typeof window.requestIdleCallback === 'function'
            ? (cb) => window.requestIdleCallback(cb)
            : (cb) => setTimeout(cb, 50);

        scheduleRevalidation(() => {
          // eslint-disable-next-line no-console
          console.log('[Dashboard cache] fetching fresh data');
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
