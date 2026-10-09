/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';

import type { DashboardApi } from '../dashboard_api/types';
import { createDashboardChangeHistoryAdapter } from './dashboard_change_history_adapter';

const getHttp = () =>
  ({ get: jest.fn(), post: jest.fn() } as unknown as jest.Mocked<Pick<HttpSetup, 'get' | 'post'>> &
    HttpSetup);

const getDashboardApi = (hasUnsavedChanges: boolean) =>
  ({
    uuid: 'api-uuid',
    user: { name: 'Hannah' },
    hasUnsavedChanges$: { getValue: () => hasUnsavedChanges },
    getSerializedState: () => ({ attributes: { title: 'Unsaved' } }),
    setState: jest.fn(),
  } as unknown as jest.Mocked<DashboardApi>);

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
    http.get.mockRejectedValue({ body: { statusCode: 404, message: 'nope' } });

    const adapter = createDashboardChangeHistoryAdapter(http, undefined);
    await expect(
      adapter.listChanges({ objectId: 'dash-1', page: { index: 0, size: 20 } })
    ).rejects.toBeDefined();
  });

  describe('getPendingChange', () => {
    it('returns nothing without unsaved changes', () => {
      const adapter = createDashboardChangeHistoryAdapter(getHttp(), getDashboardApi(false));
      expect(adapter.getPendingChange?.()).toBeUndefined();
    });

    it('returns the unsaved state of the dashboard', () => {
      const adapter = createDashboardChangeHistoryAdapter(getHttp(), getDashboardApi(true));
      expect(adapter.getPendingChange?.()).toEqual(
        expect.objectContaining({
          id: 'api-uuid',
          actor: { name: 'Hannah' },
          snapshot: { title: 'Unsaved' },
          metadata: { unsavedChanges: true },
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
      const restored = { title: 'Restored' };
      http.post.mockResolvedValue(restored);
      const dashboardApi = getDashboardApi(false);

      const adapter = createDashboardChangeHistoryAdapter(http, dashboardApi);
      await adapter.restoreChange?.({ objectId: 'dash-1', changeId: 'c1' });

      expect(http.post).toHaveBeenCalledWith(
        '/internal/dashboard/change_history/dash-1/c1/_restore',
        { signal: undefined }
      );
      expect(dashboardApi.setState).toHaveBeenCalledWith(restored, true);
    });
  });
});
