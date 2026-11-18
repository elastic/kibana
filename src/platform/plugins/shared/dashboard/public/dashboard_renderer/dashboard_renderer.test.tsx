/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { loadDashboardApi } from '../dashboard_api/load_dashboard_api';
import type { DashboardApi } from '../dashboard_api/types';
import { DashboardRenderer } from './dashboard_renderer';

jest.mock('../dashboard_api/load_dashboard_api', () => ({
  loadDashboardApi: jest.fn(),
}));

jest.mock('./viewport/dashboard_viewport', () => ({
  DashboardViewport: () => null,
}));

const loadDashboardApiMock = loadDashboardApi as jest.MockedFunction<typeof loadDashboardApi>;

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function mockLoadedDashboard() {
  const cleanup = jest.fn();
  const api = {
    expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
  } as unknown as DashboardApi;

  return {
    api,
    cleanup,
    internalApi: {},
  };
}

describe('DashboardRenderer onApiCleanup', () => {
  beforeEach(() => {
    loadDashboardApiMock.mockReset();
  });

  it('notifies the consumer when a published dashboard is torn down', async () => {
    const loaded = mockLoadedDashboard();
    const pending = deferred<typeof loaded>();
    loadDashboardApiMock.mockReturnValue(pending.promise);
    const onApiAvailable = jest.fn();
    const onApiCleanup = jest.fn();

    const { unmount } = render(
      <DashboardRenderer
        savedObjectId="dashboard-a"
        onApiAvailable={onApiAvailable}
        onApiCleanup={onApiCleanup}
      />
    );

    await act(async () => {
      pending.resolve(loaded);
    });

    expect(onApiAvailable).toHaveBeenCalledWith(loaded.api);
    expect(onApiCleanup).not.toHaveBeenCalled();

    unmount();

    expect(loaded.cleanup).toHaveBeenCalled();
    expect(onApiCleanup).toHaveBeenCalledTimes(1);
  });

  it('does not notify the consumer when a load is canceled before the api is published', async () => {
    const loaded = mockLoadedDashboard();
    const pending = deferred<typeof loaded>();
    loadDashboardApiMock.mockReturnValue(pending.promise);
    const onApiAvailable = jest.fn();
    const onApiCleanup = jest.fn();

    const { unmount } = render(
      <DashboardRenderer
        savedObjectId="dashboard-a"
        onApiAvailable={onApiAvailable}
        onApiCleanup={onApiCleanup}
      />
    );

    unmount();

    await act(async () => {
      pending.resolve(loaded);
    });

    expect(onApiAvailable).not.toHaveBeenCalled();
    expect(loaded.cleanup).toHaveBeenCalled();
    expect(onApiCleanup).not.toHaveBeenCalled();
  });

  it('does not let a canceled load for the same id clear a later published dashboard', async () => {
    const firstLoad = mockLoadedDashboard();
    const secondLoad = mockLoadedDashboard();
    const thirdLoad = mockLoadedDashboard();
    const firstPending = deferred<typeof firstLoad>();
    const secondPending = deferred<typeof secondLoad>();
    const thirdPending = deferred<typeof thirdLoad>();
    loadDashboardApiMock
      .mockReturnValueOnce(firstPending.promise)
      .mockReturnValueOnce(secondPending.promise)
      .mockReturnValueOnce(thirdPending.promise);
    const onApiAvailable = jest.fn();
    const onApiCleanup = jest.fn();

    const { rerender, unmount } = render(
      <DashboardRenderer
        savedObjectId="dashboard-a"
        onApiAvailable={onApiAvailable}
        onApiCleanup={onApiCleanup}
      />
    );

    rerender(
      <DashboardRenderer
        savedObjectId="dashboard-b"
        onApiAvailable={onApiAvailable}
        onApiCleanup={onApiCleanup}
      />
    );
    rerender(
      <DashboardRenderer
        savedObjectId="dashboard-a"
        onApiAvailable={onApiAvailable}
        onApiCleanup={onApiCleanup}
      />
    );

    await act(async () => {
      thirdPending.resolve(thirdLoad);
    });

    expect(onApiAvailable).toHaveBeenCalledTimes(1);
    expect(onApiAvailable).toHaveBeenCalledWith(thirdLoad.api);

    await act(async () => {
      firstPending.resolve(firstLoad);
      secondPending.resolve(secondLoad);
    });

    expect(firstLoad.cleanup).toHaveBeenCalled();
    expect(secondLoad.cleanup).toHaveBeenCalled();
    expect(onApiCleanup).not.toHaveBeenCalled();

    unmount();

    expect(thirdLoad.cleanup).toHaveBeenCalled();
    expect(onApiCleanup).toHaveBeenCalledTimes(1);
  });
});
