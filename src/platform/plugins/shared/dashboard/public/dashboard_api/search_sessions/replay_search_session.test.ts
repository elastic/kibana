/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import { dataService } from '../../services/kibana_services';
import {
  forgetDashboardSearchSession,
  initializeReplaySearchSession,
} from './replay_search_session';

const freshTimeRange = { from: '2021-08-31T21:00:00.000Z', to: '2021-08-31T22:00:00.000Z' };
const cachedReplay = {
  hit: true as const,
  sessionId: 'cached',
  timeRange: {
    from: '2021-08-31T20:00:00.000Z',
    to: '2021-08-31T21:00:00.000Z',
    mode: 'absolute' as const,
  },
  lastFetched: '2021-08-31T21:00:00.000Z',
};

const setup = (savedObjectId: string | undefined) => {
  const dashboardApi = {
    savedObjectId$: new BehaviorSubject<string | undefined>(savedObjectId),
    timeRange$: new BehaviorSubject<TimeRange | undefined>({ from: 'now-15m', to: 'now' }),
  };

  return { dashboardApi, replaySearchSession: initializeReplaySearchSession(dashboardApi) };
};

describe('initializeReplaySearchSession', () => {
  const { replayCache, search, query } = dataService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(search.session.isCurrentSession).mockReset();
  });

  test('replays the cached session of the dashboard on its initial load', () => {
    const { replaySearchSession } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);

    expect(replaySearchSession.getInitialSearchSessionId()).toBe('cached');
    expect(replayCache.get).toHaveBeenCalledWith('dashboard:dashboard-id', expect.any(String));
    expect(search.session.continue).toHaveBeenCalledWith('cached');
    expect(search.session.start).not.toHaveBeenCalled();
  });

  test('starts and caches a new session when nothing is cached', () => {
    const { replaySearchSession } = setup('dashboard-id');
    jest.mocked(search.session.start).mockReturnValueOnce('new');
    jest.mocked(query.timefilter.timefilter.getAbsoluteTime).mockReturnValueOnce(freshTimeRange);

    expect(replaySearchSession.getInitialSearchSessionId()).toBe('new');
    expect(replayCache.set).toHaveBeenCalledWith('dashboard:dashboard-id', {
      sessionId: 'new',
      timeRange: { ...freshTimeRange, mode: 'absolute' },
      contextKey: expect.any(String),
    });
  });

  test('reads the time range of a new session after starting it', () => {
    const { replaySearchSession } = setup('dashboard-id');
    jest.mocked(search.session.start).mockImplementationOnce(() => {
      jest.mocked(query.timefilter.timefilter.getAbsoluteTime).mockReturnValueOnce(freshTimeRange);

      return 'new';
    });

    replaySearchSession.startSearchSession();

    expect(replayCache.set).toHaveBeenCalledWith(
      'dashboard:dashboard-id',
      expect.objectContaining({ timeRange: { ...freshTimeRange, mode: 'absolute' } })
    );
  });

  test('replays the cached session of an unsaved dashboard whose draft is still stored', () => {
    const { replaySearchSession } = setup(undefined);
    jest.mocked(getDashboardBackupService().getState).mockReturnValueOnce({ viewMode: 'edit' });
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);

    expect(replaySearchSession.getInitialSearchSessionId()).toBe('cached');
    expect(replayCache.get).toHaveBeenCalledWith('dashboard:unsavedDashboard', expect.any(String));
  });

  test('starts a new session for a new draft without looking up the cache', () => {
    const { replaySearchSession } = setup(undefined);
    jest.mocked(search.session.start).mockReturnValueOnce('new');

    expect(replaySearchSession.getInitialSearchSessionId()).toBe('new');
    expect(replayCache.get).not.toHaveBeenCalled();
    expect(replayCache.set).toHaveBeenCalledWith(
      'dashboard:unsavedDashboard',
      expect.objectContaining({ sessionId: 'new' })
    );
  });

  test('looks up the context key it cached when nothing changed', () => {
    const { replaySearchSession } = setup('dashboard-id');

    replaySearchSession.startSearchSession();
    replaySearchSession.getInitialSearchSessionId();

    const [[, { contextKey }]] = jest.mocked(replayCache.set).mock.calls;
    expect(replayCache.get).toHaveBeenCalledWith('dashboard:dashboard-id', contextKey);
  });

  test('keeps the cached registration when continuing the same session', () => {
    const { replaySearchSession } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);

    expect(replaySearchSession.registerContinuedSearchSession('cached')).toBe('cached');
    expect(replayCache.set).not.toHaveBeenCalled();
  });

  test('registers a session continued from an editor', () => {
    const { replaySearchSession } = setup('dashboard-id');

    expect(replaySearchSession.registerContinuedSearchSession('from-editor')).toBe('from-editor');
    expect(replayCache.set).toHaveBeenCalledWith(
      'dashboard:dashboard-id',
      expect.objectContaining({ sessionId: 'from-editor' })
    );
  });

  test('keeps reporting a replayed session after coming back from an editor', () => {
    const { replaySearchSession: dashboardBeforeEditor } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);
    dashboardBeforeEditor.getInitialSearchSessionId();
    const { replaySearchSession: dashboardAfterEditor } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);

    dashboardAfterEditor.registerContinuedSearchSession('cached');

    jest
      .mocked(search.session.isCurrentSession)
      .mockImplementationOnce((sessionId) => sessionId === 'cached');
    expect(dashboardAfterEditor.isCurrentSessionReplayed()).toBe(true);
  });

  test('does not report a fresh session as replayed after coming back from an editor', () => {
    const { replaySearchSession: dashboardBeforeEditor } = setup('dashboard-id');
    jest.mocked(search.session.start).mockReturnValueOnce('fresh');
    dashboardBeforeEditor.startSearchSession();
    const { replaySearchSession: dashboardAfterEditor } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce({ ...cachedReplay, sessionId: 'fresh' });

    dashboardAfterEditor.registerContinuedSearchSession('fresh');

    jest
      .mocked(search.session.isCurrentSession)
      .mockImplementationOnce((sessionId) => sessionId === 'fresh');
    expect(dashboardAfterEditor.isCurrentSessionReplayed()).toBe(false);
  });

  test('reports the replayed session only while it is current', () => {
    const { replaySearchSession } = setup('dashboard-id');
    jest.mocked(replayCache.get).mockReturnValueOnce(cachedReplay);
    replaySearchSession.getInitialSearchSessionId();

    jest
      .mocked(search.session.isCurrentSession)
      .mockImplementationOnce((sessionId) => sessionId === 'cached');
    expect(replaySearchSession.isCurrentSessionReplayed()).toBe(true);

    jest
      .mocked(search.session.isCurrentSession)
      .mockImplementationOnce((sessionId) => sessionId === 'new');
    expect(replaySearchSession.isCurrentSessionReplayed()).toBe(false);
  });

  test('forgets the cached session of a dashboard', () => {
    forgetDashboardSearchSession('dashboard-id');

    expect(replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
  });
});
