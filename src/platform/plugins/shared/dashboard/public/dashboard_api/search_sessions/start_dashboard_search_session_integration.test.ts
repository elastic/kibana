/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, TimeRange } from '@kbn/es-query';
import { BehaviorSubject, Subject } from 'rxjs';
import type { DashboardApi } from '../..';
import { getSampleDashboardState } from '../../mocks';
import { dataService } from '../../services/kibana_services';
import type { DashboardInternalApi, DashboardSaveEvent } from '../types';
import type { ReplaySearchSession } from './replay_search_session';
import { startDashboardSearchSessionIntegration } from './start_dashboard_search_session_integration';

const setup = ({
  isCurrentSessionReplayed = false,
  searchSessionIdFromURL,
}: { isCurrentSessionReplayed?: boolean; searchSessionIdFromURL?: string } = {}) => {
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>({ from: 'now-15m', to: 'now' });
  const onSave$ = new Subject<DashboardSaveEvent>();
  const dashboardApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>([]),
    query$: new BehaviorSubject(undefined),
    timeRange$,
    isFetchPaused$: new BehaviorSubject(false),
    searchSessionId$: new BehaviorSubject<string | undefined>('initial'),
    savedObjectId$: new BehaviorSubject<string | undefined>('dashboard-id'),
    onSave$,
    forceRefresh: jest.fn(),
  } as unknown as DashboardApi;
  const replaySearchSession: ReplaySearchSession = {
    getInitialSearchSessionId: jest.fn(),
    startSearchSession: jest.fn().mockReturnValue('new'),
    registerContinuedSearchSession: jest.fn(),
    isCurrentSessionReplayed: jest.fn().mockReturnValue(isCurrentSessionReplayed),
  };
  const setSearchSessionId = jest.fn();

  startDashboardSearchSessionIntegration(
    dashboardApi,
    {} as DashboardInternalApi,
    {
      getSearchSessionIdFromURL: () => searchSessionIdFromURL,
      removeSessionIdFromUrl: jest.fn(),
      createSessionRestorationDataProvider: jest.fn(),
    },
    setSearchSessionId,
    new BehaviorSubject(false),
    replaySearchSession
  );

  return { timeRange$, onSave$, replaySearchSession, setSearchSessionId };
};

const getStorageConfig = () => {
  const [[, storageConfig]] = jest.mocked(dataService.search.session.enableStorage).mock.calls;

  return storageConfig;
};

describe('startDashboardSearchSessionIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('disables background saving while the current session is replayed', () => {
    setup({ isCurrentSessionReplayed: true });

    expect(getStorageConfig()?.isDisabled()).toEqual({
      disabled: true,
      reasonText: 'Refresh the results before saving this search in the background.',
    });
  });

  test('allows background saving when the current session is not replayed', () => {
    setup();

    expect(getStorageConfig()?.isDisabled()).toEqual({ disabled: false });
  });

  test('caches a new session when the dashboard state changes', () => {
    const { timeRange$, replaySearchSession, setSearchSessionId } = setup();

    timeRange$.next({ from: 'now-24h', to: 'now' });

    expect(replaySearchSession.startSearchSession).toHaveBeenCalled();
    expect(setSearchSessionId).toHaveBeenCalledWith('new');
  });

  test('forgets the cached session when restoring a search session from the URL', () => {
    const { timeRange$, replaySearchSession } = setup({ searchSessionIdFromURL: 'restored' });

    timeRange$.next({ from: 'now-24h', to: 'now' });

    expect(dataService.search.session.restore).toHaveBeenCalledWith('restored');
    expect(dataService.replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
    expect(replaySearchSession.startSearchSession).not.toHaveBeenCalled();
  });

  test('forgets the previous dashboard when it is saved under a new id', () => {
    const { onSave$ } = setup();

    onSave$.next({
      previousDashboardId: 'dashboard-id',
      dashboardId: 'copy-id',
      dashboardState: getSampleDashboardState(),
    });

    expect(dataService.replayCache.delete).toHaveBeenCalledWith('dashboard:dashboard-id');
  });

  test('keeps the cached session when the dashboard is saved under the same id', () => {
    const { onSave$ } = setup();

    onSave$.next({
      previousDashboardId: 'dashboard-id',
      dashboardId: 'dashboard-id',
      dashboardState: getSampleDashboardState(),
    });

    expect(dataService.replayCache.delete).not.toHaveBeenCalled();
  });
});
