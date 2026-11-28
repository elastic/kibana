/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, firstValueFrom } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';

import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import { getDashboardApi } from '../dashboard_api/get_dashboard_api';
import { saveDashboard } from '../dashboard_api/save_modal/save_dashboard';
import { dashboardClient } from '../dashboard_client';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';

jest.mock('../dashboard_api/save_modal/save_dashboard', () => ({
  saveDashboard: jest.fn(),
}));

jest.mock('../dashboard_client', () => ({
  dashboardClient: { invalidateCache: jest.fn() },
}));

const getHttp = () =>
  ({ get: jest.fn(), post: jest.fn() }) as unknown as jest.Mocked<Pick<HttpSetup, 'get' | 'post'>> &
    HttpSetup;

const getTestDashboardApi = () =>
  getDashboardApi({
    incomingEmbeddables: [],
    initialState: DEFAULT_DASHBOARD_STATE,
    savedObjectId: 'dash-1',
    user: { uid: 'spidey', name: 'Peter P.', hasGlobalAccessControlPrivilege: false },
  }).api;

describe('createDashboardChangeHistoryAdapter', () => {
  it('lists changes with 1-indexed pagination', async () => {
    const http = getHttp();
    const response = { items: [], total: 0 };
    http.get.mockResolvedValue(response);
    const signal = new AbortController().signal;

    const adapter = createDashboardChangeHistoryAdapter(http, undefined);
    await expect(
      adapter.listChanges({ objectId: 'dash-1', page: { index: 0, size: 20 }, signal })
    ).resolves.toBe(response);
    expect(http.get).toHaveBeenCalledWith('/internal/dashboard/change_history/dash-1', {
      query: { page: 1, per_page: 20 },
      signal,
    });
  });

  it('gets a single change', async () => {
    const http = getHttp();
    http.get.mockResolvedValue({ id: 'c1' });

    const adapter = createDashboardChangeHistoryAdapter(http, undefined);
    await adapter.getChange({ objectId: 'dash-1', changeId: 'c1' });
    expect(http.get).toHaveBeenCalledWith('/internal/dashboard/change_history/dash-1/c1', {
      signal: undefined,
    });
  });

  it('maps HTTP errors', async () => {
    const http = getHttp();
    http.get.mockRejectedValue({ response: { status: 404 }, body: { message: 'nope' } });

    const adapter = createDashboardChangeHistoryAdapter(http, undefined);
    await expect(
      adapter.listChanges({ objectId: 'dash-1', page: { index: 0, size: 20 } })
    ).rejects.toMatchObject({
      message: 'nope',
      body: { code: 'NOT_FOUND', message: 'nope' },
    });
  });

  describe('getPendingChange', () => {
    it('returns nothing without unsaved changes', () => {
      const adapter = createDashboardChangeHistoryAdapter(getHttp(), getTestDashboardApi());
      expect(adapter.getPendingChange?.()).toBeUndefined();
    });

    it('returns the unsaved state of the dashboard', async () => {
      const dashboardApi = getTestDashboardApi();
      const adapter = createDashboardChangeHistoryAdapter(getHttp(), dashboardApi);

      dashboardApi.setSettings({ ...dashboardApi.getSettings(), title: 'Unsaved' });
      await firstValueFrom(dashboardApi.hasUnsavedChanges$.pipe(filter(Boolean)));

      expect(adapter.getPendingChange?.()).toEqual(
        expect.objectContaining({
          id: dashboardApi.uuid,
          actor: { name: 'Peter P.' },
          snapshot: expect.objectContaining({ title: 'Unsaved' }),
          action: 'dashboard_unsaved_changes',
        })
      );
    });
  });

  describe('restoreChange', () => {
    it('is not supported without a dashboard API', () => {
      expect(
        createDashboardChangeHistoryAdapter(getHttp(), undefined).restoreChange
      ).toBeUndefined();
    });

    it('posts to the restore route and applies the restored state', async () => {
      const http = getHttp();
      const restored = { ...DEFAULT_DASHBOARD_STATE, title: 'Restored' };
      http.post.mockResolvedValue(restored);
      const dashboardApi = getTestDashboardApi();

      const adapter = createDashboardChangeHistoryAdapter(http, dashboardApi);
      await adapter.restoreChange?.({ objectId: 'dash-1', changeId: 'c1' });

      expect(http.post).toHaveBeenCalledWith(
        '/internal/dashboard/change_history/dash-1/c1/_restore',
        { signal: undefined }
      );
      expect(dashboardClient.invalidateCache).toHaveBeenCalledWith('dash-1');
      expect(dashboardApi.getSettings().title).toBe('Restored');
      // restoring must not save again, which would create a duplicate change history entry
      expect(saveDashboard).not.toHaveBeenCalled();
      // ensure that normal saving works as expected
      await dashboardApi.runQuickSave();
      expect(saveDashboard).toHaveBeenCalled();
    });
  });
});
