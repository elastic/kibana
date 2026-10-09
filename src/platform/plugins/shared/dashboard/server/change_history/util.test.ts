/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { getChangeHistoryClient } from './change_history_service';
import { addToHistory } from './util';

jest.mock('./change_history_service');

const mockedGetClient = getChangeHistoryClient as jest.MockedFunction<
  typeof getChangeHistoryClient
>;

const getContext = (user: unknown = { username: 'elastic', profile_uid: 'u_1' }) =>
  ({
    core: Promise.resolve({ security: { authc: { getCurrentUser: () => user } } }),
  } as unknown as RequestHandlerContext);

const getClient = (previousSnapshot?: DashboardState) => ({
  getHistory: jest.fn().mockResolvedValue({
    items: previousSnapshot ? [{ object: { snapshot: previousSnapshot } }] : [],
  }),
  log: jest.fn().mockResolvedValue(undefined),
});

const baseArgs = {
  dashboardId: 'dash-1',
  spaceId: 'default',
  timestamp: '2026-01-01T00:00:00.000Z',
  snapshot: { title: 'New' } as DashboardState,
};

describe('addToHistory', () => {
  beforeEach(() => jest.resetAllMocks());

  it('throws when there is no authenticated user', async () => {
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(null), sequence: { current: 1 } })
    ).rejects.toThrow('User not authenticated');
  });

  it('does nothing when the change history client is not ready', async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error('not ready');
    });
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: { current: 1 } })
    ).resolves.toBeUndefined();
  });

  it('does not log when the sequence did not change', async () => {
    const client = getClient();
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: { previous: 3, current: 3 } });
    expect(client.log).not.toHaveBeenCalled();
  });

  it('logs the first version without a change count', async () => {
    const client = getClient();
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: { current: 1 } });

    expect(client.log).toHaveBeenCalledWith(
      {
        objectType: 'dashboard',
        objectId: 'dash-1',
        sequence: 1,
        snapshot: baseArgs.snapshot,
      },
      expect.objectContaining({
        action: 'dashboard_update',
        username: 'elastic',
        userProfileId: 'u_1',
        spaceId: 'default',
        data: { metadata: {} },
      })
    );
  });

  it('stores the change count compared with the previous snapshot', async () => {
    const client = getClient({ title: 'Old' } as DashboardState);
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: { previous: 1, current: 2 } });

    expect(client.log.mock.calls[0][1].data.metadata).toEqual({ changeCount: 1 });
    expect(client.log.mock.calls[0][1].refresh).toBeUndefined();
  });

  it('records restoredFrom and waits for refresh on restore', async () => {
    const client = getClient({ title: 'Old' } as DashboardState);
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({
      ...baseArgs,
      ctx: getContext(),
      sequence: { previous: 4, current: 5 },
      restoredFrom: 2,
    });

    const options = client.log.mock.calls[0][1];
    expect(options.data.metadata).toEqual({ changeCount: 1, restoredFrom: 2 });
    expect(options.refresh).toBe('wait_for');
  });

  it('swallows history write failures', async () => {
    const client = getClient();
    client.log.mockRejectedValue(new Error('boom'));
    mockedGetClient.mockReturnValue(client as never);
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: { current: 1 } })
    ).resolves.toBeUndefined();
  });
});
