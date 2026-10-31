/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDashboardBackupService } from '../../services/dashboard_api_services';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_backup_service';
import { cpsService, dataService } from '../../services/kibana_services';
import type { DashboardApi } from '../types';
import { getReplayCacheContextKey } from './get_replay_cache_context_key';

type ReplaySearchSessionApi = Pick<DashboardApi, 'savedObjectId$' | 'timeRange$'>;

export type ReplaySearchSession = ReturnType<typeof initializeReplaySearchSession>;

const replayedSessionIdByAssetId = new Map<string, string>();

/** Discards the cached search session of a dashboard, the unsaved one included. */
export const forgetDashboardSearchSession = (savedObjectId: string | undefined) => {
  const assetId = getReplayCacheAssetId(savedObjectId);

  replayedSessionIdByAssetId.delete(assetId);
  dataService.replayCache.delete(assetId);
};

/** Replays the cached search session of a dashboard on its initial load and caches the new ones. */
export function initializeReplaySearchSession(dashboardApi: ReplaySearchSessionApi) {
  const { replayCache, search, query } = dataService;
  const { session } = search;

  const getAssetId = () => getReplayCacheAssetId(dashboardApi.savedObjectId$.value);

  const registerSearchSession = (searchSessionId: string, contextKey: string) => {
    const assetId = getAssetId();
    const timeRange = query.timefilter.timefilter.getAbsoluteTime();

    replayedSessionIdByAssetId.delete(assetId);
    replayCache.set(assetId, {
      sessionId: searchSessionId,
      timeRange: { ...timeRange, mode: 'absolute' },
      contextKey,
    });
  };

  const startSearchSession = () => {
    const searchSessionId = session.start();
    registerSearchSession(searchSessionId, getContextKey(dashboardApi));

    return searchSessionId;
  };

  const registerContinuedSearchSession = (searchSessionId: string) => {
    const contextKey = getContextKey(dashboardApi);
    const replay = replayCache.get(getAssetId(), contextKey);

    if (replay.hit && replay.sessionId === searchSessionId) {
      return searchSessionId;
    }

    registerSearchSession(searchSessionId, contextKey);

    return searchSessionId;
  };

  const getInitialSearchSessionId = () => {
    if (isNewDraft(dashboardApi)) {
      return startSearchSession();
    }

    const replay = replayCache.get(getAssetId(), getContextKey(dashboardApi));

    if (!replay.hit) {
      return startSearchSession();
    }

    if (!session.isCurrentSession(replay.sessionId)) {
      session.continue(replay.sessionId);
    }

    replayedSessionIdByAssetId.set(getAssetId(), replay.sessionId);

    return replay.sessionId;
  };

  const isCurrentSessionReplayed = () => {
    const replayedSessionId = replayedSessionIdByAssetId.get(getAssetId());

    return replayedSessionId !== undefined && session.isCurrentSession(replayedSessionId);
  };

  return {
    getInitialSearchSessionId,
    startSearchSession,
    registerContinuedSearchSession,
    isCurrentSessionReplayed,
  };
}

const getReplayCacheAssetId = (savedObjectId: string | undefined) =>
  `dashboard:${savedObjectId ?? DASHBOARD_PANELS_UNSAVED_ID}`;

const isNewDraft = ({ savedObjectId$ }: ReplaySearchSessionApi) =>
  savedObjectId$.value === undefined &&
  getDashboardBackupService().getState(DASHBOARD_PANELS_UNSAVED_ID) === undefined;

const getContextKey = ({ timeRange$ }: ReplaySearchSessionApi) => {
  const { filterManager } = dataService.query;

  return getReplayCacheContextKey({
    timeRange: timeRange$.value,
    pinnedFilters: filterManager.getGlobalFilters(),
    projectRouting: cpsService?.cpsManager?.getProjectRouting(),
  });
};
