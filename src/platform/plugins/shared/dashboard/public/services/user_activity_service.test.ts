/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMockDashboardApi } from '../mocks';
import { coreServices } from './kibana_services';
import { getDashboardUserActivityService } from './user_activity_service';

describe(`user activity service`, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tracks view', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'view', start: 1777676707154 });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    expect(coreServices.http.post).not.toBeCalled();

    api.userActivity$.next({ type: 'view', end: 1777676707204 });
    expect(coreServices.http.post).toBeCalledWith(
      expect.stringContaining('/internal/dashboard/user_activity/view/'),
      {
        asSystemRequest: true,
        body: JSON.stringify({
          title: 'My Dashboard',
          start: 1777676707154,
          end: 1777676707204,
          tags: [],
        }),
        keepalive: true,
        method: 'POST',
      }
    );
  });

  it('tracks manual refresh', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'refresh', start: 1777676707154, refreshType: 'manual' });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    expect(coreServices.http.post).not.toBeCalled();

    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    expect(coreServices.http.post).toBeCalledWith(
      expect.stringContaining('/internal/dashboard/user_activity/refresh_manual/'),
      {
        asSystemRequest: true,
        body: JSON.stringify({
          title: 'My Dashboard',
          start: 1777676707154,
          end: 1777676707204,
          tags: [],
          meta: {
            time_range: {
              to: 'now',
              from: 'now-15m',
            },
            query: { query: 'hi', language: 'kuery' },
            filters: [],
            panel_count: 0,
            errors: [],
          },
        }),
        method: 'POST',
      }
    );
  });

  it('tracks auto refresh', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'refresh', start: 1777676707154, refreshType: 'auto' });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    expect(coreServices.http.post).not.toBeCalled();

    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    expect(coreServices.http.post).toBeCalledWith(
      expect.stringContaining('/internal/dashboard/user_activity/refresh_auto/'),
      {
        asSystemRequest: true,
        body: JSON.stringify({
          title: 'My Dashboard',
          start: 1777676707154,
          end: 1777676707204,
          tags: [],
          meta: {
            time_range: {
              to: 'now',
              from: 'now-15m',
            },
            query: { query: 'hi', language: 'kuery' },
            filters: [],
            panel_count: 0,
            errors: [],
          },
        }),
        method: 'POST',
      }
    );
  });

  it('does not track if no matching start event', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'view', end: 1777676707204 });
    expect(coreServices.http.post).not.toBeCalled();
  });
});
