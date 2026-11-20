/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHashHistory } from 'history';
import { cpsServiceMock, resetCpsMock } from '@kbn/cps/public/__mocks__';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardCreationOptions } from '../types';
import { setStubKibanaServices } from '../../services/mocks';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { getSampleDashboardState } from '../../mocks';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import { dataService } from '../../services/kibana_services';
import { getDashboardApi } from '../get_dashboard_api';

import { getReplayCacheContextKey } from './get_replay_cache_context_key';

const timeRange = { from: 'now-15m', to: 'now' };
const cachedTimeRange = { from: '2026-11-01T11:45:00.000Z', to: '2026-11-01T12:00:00.000Z' };
const freshTimeRange = { from: '2026-11-01T12:45:00.000Z', to: '2026-11-01T13:00:00.000Z' };
const replay = {
  hit: true as const,
  sessionId: 'cached-session',
  timeRange: { ...cachedTimeRange, mode: 'absolute' as const },
  lastFetched: cachedTimeRange.to,
};

setStubKibanaServices({ cps: { ...cpsServiceMock, isTierEligible: true } });

const { replayCache, search, query } = dataService;
const { session } = search;
const cleanupCallbacks: Array<() => void> = [];

const setup = (
  overrides: {
    savedObjectId?: string;
    incomingEmbeddables?: EmbeddablePackageState[];
    sessionIdToRestore?: string;
    initialState?: Partial<DashboardState>;
    creationOptions?: DashboardCreationOptions;
    skipReplay?: boolean;
  } = {}
) => {
  const { savedObjectId, incomingEmbeddables, sessionIdToRestore, initialState, creationOptions } =
    {
      savedObjectId: 'dashboard-id',
      ...overrides,
    };
  const settings = {
    sessionIdToRestore,
    getSearchSessionIdFromURL: jest.fn<string | undefined, []>(),
    removeSessionIdFromUrl: jest.fn(),
    createSessionRestorationDataProvider: jest.fn(),
  };
  const dashboard = getDashboardApi({
    savedObjectId,
    skipReplay: overrides.skipReplay,
    incomingEmbeddables,
    initialState: getSampleDashboardState({ time_range: timeRange, ...initialState }),
    creationOptions: { searchSessionSettings: settings, ...creationOptions },
  });
  cleanupCallbacks.push(dashboard.cleanup);
  return { ...dashboard, settings };
};

const getStorageAvailability = () => {
  const [[, config]] = jest.mocked(session.enableStorage).mock.calls;
  return config?.isDisabled();
};

describe('Dashboard search sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCpsMock();
    jest.mocked(replayCache.get).mockReturnValue({ hit: false });
    jest.mocked(session.getSessionId).mockReturnValue(undefined);
    jest.mocked(session.isCurrentSession).mockReturnValue(false);
    jest.mocked(session.isRestore).mockReturnValue(false);
    jest.mocked(session.start).mockImplementation(() => {
      jest.mocked(session.resolveTimeRange).mockReturnValue(freshTimeRange);
      return 'fresh-session';
    });
    jest.mocked(session.resolveTimeRange).mockReturnValue(cachedTimeRange);
    jest.mocked(query.filterManager.getGlobalFilters).mockReturnValue([]);
    jest.mocked(getDashboardBackupService().getState).mockReturnValue(undefined);
  });

  afterEach(() => {
    cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
  });

  test('registers a first visit after starting the session and advancing now', () => {
    const { api } = setup();

    expect(api.searchSessionId$.value).toBe('fresh-session');
    expect(session.resolveTimeRange).toHaveBeenCalledWith(timeRange);
    expect(replayCache.set).toHaveBeenCalledTimes(1);
    expect(replayCache.set).toHaveBeenCalledWith('dashboard:dashboard-id', {
      sessionId: 'fresh-session',
      timeRange: { ...freshTimeRange, mode: 'absolute' },
      contextKey: getReplayCacheContextKey({ timeRange, pinnedFilters: [] }),
    });
  });

  test('continues a compatible session without registering or changing the relative selection', async () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api, cleanup } = setup();

    expect(session.continue).toHaveBeenCalledWith('cached-session');
    expect(await api.requestSearchSessionId?.()).toBe('cached-session');
    expect(api.timeRange$.value).toEqual(timeRange);
    expect(api.replayCacheLastFetched$.value).toBe(replay.lastFetched);
    expect(session.start).not.toHaveBeenCalled();
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(query.timefilter.timefilter.setTime).not.toHaveBeenCalled();
    expect(getStorageAvailability()?.disabled).toBe(true);
    cleanup();
    expect(replayCache.delete).not.toHaveBeenCalled();
  });

  test('starts and registers a new session when navigation skips replay', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api } = setup({ skipReplay: true });

    expect(replayCache.get).not.toHaveBeenCalled();
    expect(api.searchSessionId$.value).toBe('fresh-session');
    expect(api.replayCacheLastFetched$.value).toBeUndefined();
    expect(replayCache.set).toHaveBeenCalledWith(
      'dashboard:dashboard-id',
      expect.objectContaining({ sessionId: 'fresh-session' })
    );
  });

  test('Refresh replaces a replay with one newly registered session', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api } = setup();
    api.forceRefresh();

    expect(session.start).toHaveBeenCalledTimes(1);
    expect(replayCache.set).toHaveBeenCalledTimes(1);
    expect(api.searchSessionId$.value).toBe('fresh-session');
    expect(api.replayCacheLastFetched$.value).toBeUndefined();
    expect(getStorageAvailability()).toEqual({ disabled: false });
  });

  test('looks up replay with the restored time and routing', () => {
    const storedTime = { from: 'now-1d', to: 'now' };
    const storedRouting = '_alias:_origin';

    setup({
      initialState: {
        time_range: storedTime,
        project_routing: storedRouting,
      },
      creationOptions: {
        useUnifiedSearchIntegration: true,
        unifiedSearchSettings: {
          kbnUrlStateStorage: createKbnUrlStateStorage({
            history: createHashHistory(),
            useHash: false,
          }),
        },
      },
    });

    expect(replayCache.get).toHaveBeenCalledWith(
      'dashboard:dashboard-id',
      getReplayCacheContextKey({
        timeRange: storedTime,
        pinnedFilters: [],
        projectRouting: storedRouting,
      })
    );
  });

  test('keeps the session and cache registration when routing changes', () => {
    const { api } = setup();
    api.setProjectRouting('_alias:_origin');

    expect(session.start).toHaveBeenCalledTimes(1);
    expect(replayCache.set).toHaveBeenCalledTimes(1);
    expect(replayCache.set).toHaveBeenLastCalledWith(
      'dashboard:dashboard-id',
      expect.objectContaining({
        contextKey: getReplayCacheContextKey({
          timeRange,
          pinnedFilters: [],
        }),
      })
    );
  });

  test('Cancel invalidates responses while keeping a replay unavailable for background saving', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api } = setup();
    api.cancelAllRequests();

    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
    expect(api.replayCacheLastFetched$.value).toBe(replay.lastFetched);
    expect(getStorageAvailability()?.disabled).toBe(true);
    expect(replayCache.set).not.toHaveBeenCalled();
  });

  test('discarding dashboard edits invalidates its replay registration', async () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api } = setup();
    await api.asyncResetToLastSavedState();

    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
  });

  test('background restore takes precedence over replay and incoming editor sessions', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api } = setup({
      sessionIdToRestore: 'background-session',
      incomingEmbeddables: [
        { type: 'lens', serializedState: {}, searchSessionId: 'editor-session' },
      ],
    });

    expect(session.restore).toHaveBeenCalledWith('background-session');
    expect(api.searchSessionId$.value).toBe('background-session');
    expect(session.continue).not.toHaveBeenCalled();
    expect(replayCache.get).not.toHaveBeenCalled();
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
  });

  test('restores a background session from a changed URL without registering it for replay', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    const { api, settings } = setup();
    settings.getSearchSessionIdFromURL.mockReturnValue('background-session');
    api.forceRefresh();

    expect(session.restore).toHaveBeenCalledWith('background-session');
    expect(api.searchSessionId$.value).toBe('background-session');
    expect(api.replayCacheLastFetched$.value).toBeUndefined();
    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(session.start).not.toHaveBeenCalled();
  });

  test('preserves a session returned from Lens without evicting its existing registration', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    jest.mocked(session.getSessionId).mockReturnValue(replay.sessionId);
    const { api } = setup({
      skipReplay: true,
      incomingEmbeddables: [
        { type: 'lens', serializedState: {}, searchSessionId: replay.sessionId },
      ],
    });

    expect(api.searchSessionId$.value).toBe(replay.sessionId);
    expect(api.replayCacheLastFetched$.value).toBe(replay.lastFetched);
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(replayCache.delete).not.toHaveBeenCalled();
  });

  test('replaces an older cached session with the refreshed session returned from Lens', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    jest.mocked(session.getSessionId).mockReturnValue('editor-session');
    jest.mocked(session.continue).mockImplementationOnce(() => {
      jest.mocked(session.resolveTimeRange).mockReturnValue(freshTimeRange);
    });
    const { api } = setup({
      incomingEmbeddables: [
        { type: 'lens', serializedState: {}, searchSessionId: 'editor-session' },
      ],
    });

    expect(api.searchSessionId$.value).toBe('editor-session');
    expect(replayCache.set).toHaveBeenCalledTimes(1);
    expect(replayCache.set).toHaveBeenCalledWith('dashboard:dashboard-id', {
      sessionId: 'editor-session',
      timeRange: { ...freshTimeRange, mode: 'absolute' },
      contextKey: getReplayCacheContextKey({ timeRange, pinnedFilters: [] }),
    });
    expect(session.start).not.toHaveBeenCalled();
  });

  test('does not register an incoming editor session without a compatible registration', () => {
    jest.mocked(session.getSessionId).mockReturnValue('editor-session');
    const { api } = setup({
      incomingEmbeddables: [
        { type: 'lens', serializedState: {}, searchSessionId: 'editor-session' },
      ],
    });

    expect(api.searchSessionId$.value).toBe('editor-session');
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(session.start).not.toHaveBeenCalled();
  });

  test('does not register a restored background search returned from an editor', () => {
    jest.mocked(replayCache.get).mockReturnValue(replay);
    jest.mocked(session.getSessionId).mockReturnValue('restored-session');
    jest.mocked(session.isRestore).mockReturnValue(true);
    const { api } = setup({
      incomingEmbeddables: [
        { type: 'lens', serializedState: {}, searchSessionId: 'restored-session' },
      ],
    });

    expect(api.searchSessionId$.value).toBe('restored-session');
    expect(api.replayCacheLastFetched$.value).toBeUndefined();
    expect(replayCache.set).not.toHaveBeenCalled();
    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
  });

  test.each([
    { draft: undefined, looksUpCache: 0, sessionId: 'fresh-session' },
    { draft: { viewMode: 'edit' as const }, looksUpCache: 1, sessionId: 'cached-session' },
  ])(
    'uses the backup draft identity when its state is $draft',
    ({ draft, looksUpCache, sessionId }) => {
      jest.mocked(getDashboardBackupService().getState).mockReturnValue(draft);
      jest.mocked(replayCache.get).mockReturnValue(replay);
      const { api } = setup({ savedObjectId: undefined });

      expect(replayCache.get).toHaveBeenCalledTimes(looksUpCache);
      expect(api.searchSessionId$.value).toBe(sessionId);
    }
  );
});
