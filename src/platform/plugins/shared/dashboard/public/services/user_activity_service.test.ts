/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { buildMockDashboardApi } from '../mocks';
import { coreServices } from './kibana_services';
import { getDashboardUserActivityService } from './user_activity_service';
import { BehaviorSubject } from 'rxjs';

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
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledWith(
        expect.stringContaining('/internal/dashboard/user_activity/view/'),
        {
          keepalive: true,
          method: 'POST',
          body: JSON.stringify({
            title: 'My Dashboard',
            start: 1777676707154,
            end: 1777676707204,
            tags: [],
          }),
        }
      );
    });
  });

  it('tracks refresh', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'refresh', start: 1777676707154 });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    expect(coreServices.http.post).not.toBeCalled();

    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledWith(
        expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'My Dashboard',
            start: 1777676707154,
            end: 1777676707204,
            tags: [],
            meta: {
              time_range: {
                from: 'now-15m',
                to: 'now',
              },
              query: { expression: 'hi', language: 'kql' },
              panel_count: 0,
              errors: [],
            },
          }),
        }
      );
    });
  });

  it('can track both view and refresh at the same time', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'view', start: 1777676707154 });
    api.userActivity$.next({ type: 'refresh', start: 1777676707160 });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    expect(coreServices.http.post).not.toBeCalled();

    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    await waitFor(() => {
      expect(coreServices.http.post).nthCalledWith(
        1,
        expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
        expect.objectContaining({
          body: expect.stringContaining(`\"start\":1777676707160,\"end\":1777676707204`),
        })
      );
    });

    api.userActivity$.next({ type: 'view', end: 1777676707210 });
    await waitFor(() => {
      expect(coreServices.http.post).nthCalledWith(
        2,
        expect.stringContaining('/internal/dashboard/user_activity/view/'),
        expect.objectContaining({
          body: expect.stringContaining(`\"start\":1777676707154,\"end\":1777676707210`),
        })
      );
    });
  });

  it('cannot track multiple view events', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'view', start: 1777676707154 });
    api.userActivity$.next({ type: 'view', start: 1777676707160 });
    api.userActivity$.next({ type: 'view', start: 1777676707170 });

    api.userActivity$.next({ type: 'view', end: 1777676707204 });
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledTimes(1);
    });
    expect(coreServices.http.post).toBeCalledWith(
      expect.stringContaining('/internal/dashboard/user_activity/view/'),
      expect.objectContaining({
        body: expect.stringContaining(`\"start\":1777676707154,\"end\":1777676707204`),
      })
    );
  });

  it('can track multiple refresh events', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'refresh', start: 1777676707154 });
    api.userActivity$.next({ type: 'refresh', start: 1777676707160 });
    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledTimes(1);
    });
    api.userActivity$.next({ type: 'refresh', end: 1777676707209 });
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledTimes(2);
    });
    expect(coreServices.http.post).nthCalledWith(
      1,
      expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
      expect.objectContaining({
        body: expect.stringContaining(`\"start\":1777676707154,\"end\":1777676707204`),
      })
    );
    expect(coreServices.http.post).nthCalledWith(
      2,
      expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
      expect.objectContaining({
        body: expect.stringContaining(`\"start\":1777676707160,\"end\":1777676707209`),
      })
    );
  });

  it('does not track if no matching start event', async () => {
    const { api } = buildMockDashboardApi();
    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'view', end: 1777676707204 });
    expect(coreServices.http.post).not.toBeCalled();
  });

  it('reports panel errors for refresh events', async () => {
    const { api } = buildMockDashboardApi();
    const childrenSpy = jest.spyOn(api.children$, 'getValue');
    childrenSpy.mockReturnValue({
      child1: {},
      child2: { blockingError$: new BehaviorSubject(new Error('this is an error')) },
    });
    getDashboardUserActivityService(api);

    api.userActivity$.next({ type: 'refresh', start: 1777676707154 });
    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });
    await waitFor(() => {
      expect(coreServices.http.post).toBeCalled();
    });
    expect(coreServices.http.post).toBeCalledWith(
      expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
      expect.objectContaining({
        body: JSON.stringify({
          title: 'My Dashboard',
          start: 1777676707154,
          end: 1777676707204,
          tags: [],
          meta: {
            time_range: {
              from: 'now-15m',
              to: 'now',
            },
            query: { expression: 'hi', language: 'kql' },
            panel_count: 0,
            errors: [{ panel_id: 'child2', error: 'this is an error' }],
          },
        }),
      })
    );
  });

  it('reports time range when `timeRestore` is false', async () => {
    const { api } = buildMockDashboardApi();
    api.setSettings({ time_restore: false });

    getDashboardUserActivityService(api);
    api.userActivity$.next({ type: 'refresh', start: 1777676707154 });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));
    api.userActivity$.next({ type: 'refresh', end: 1777676707204 });

    await waitFor(() => {
      expect(coreServices.http.post).toBeCalledWith(
        expect.stringContaining('/internal/dashboard/user_activity/refresh/'),
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'My Dashboard',
            start: 1777676707154,
            end: 1777676707204,
            tags: [],
            meta: {
              time_range: {
                from: 'now-15m',
                to: 'now',
              },
              query: { expression: 'hi', language: 'kql' },
              panel_count: 0,
              errors: [],
            },
          }),
        }
      );
    });
  });
});
