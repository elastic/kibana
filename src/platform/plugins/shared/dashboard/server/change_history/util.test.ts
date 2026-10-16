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
import { transformDashboardOut } from '../api/transforms';
import { addToHistory, getNextHistorySequenceFromHistory, getHistorySnapshot } from './util';

jest.mock('./change_history_service');
jest.mock('../api/transforms');

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

describe('getNextHistorySequenceFromHistory', () => {
  beforeEach(() => jest.resetAllMocks());

  it('continues after the latest existing sequence', async () => {
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { sequence: 2 } }] }),
    };
    mockedGetClient.mockReturnValue(client as never);
    expect(
      await getNextHistorySequenceFromHistory({ spaceId: 'default', dashboardId: 'dash-1' })
    ).toBe(3);
  });

  it('starts at the initial sequence when there is no history', async () => {
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    mockedGetClient.mockReturnValue(client as never);
    expect(
      await getNextHistorySequenceFromHistory({ spaceId: 'default', dashboardId: 'dash-1' })
    ).toBe(1);
  });

  it('starts at the initial sequence when the client is unavailable', async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error('not ready');
    });
    expect(
      await getNextHistorySequenceFromHistory({ spaceId: 'default', dashboardId: 'dash-1' })
    ).toBe(1);
  });
});

describe('addToHistory', () => {
  beforeEach(() => jest.resetAllMocks());

  it('logs without an actor when there is no authenticated user (security disabled)', async () => {
    const client = getClient();
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(null), sequence: 1 });
    expect(client.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ username: '', userProfileId: undefined })
    );
  });

  it('does nothing when the change history client is not ready', async () => {
    mockedGetClient.mockImplementation(() => {
      throw new Error('not ready');
    });
    await expect(
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 })
    ).resolves.toBeUndefined();
  });

  it('logs the first version without a change count', async () => {
    const client = getClient();
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 });

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

  it('logs deletes with their sequence', async () => {
    const client = getClient();
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: 4, type: 'delete' });

    expect(client.log).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'dash-1', sequence: 4 }),
      expect.objectContaining({ action: 'dashboard_delete' })
    );
  });

  it('stores the change count compared with the previous snapshot', async () => {
    const client = getClient({ title: 'Old' } as DashboardState);
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({ ...baseArgs, ctx: getContext(), sequence: 2 });

    expect(client.log.mock.calls[0][1].data.metadata).toEqual({ changeCount: 1 });
    expect(client.log.mock.calls[0][1].refresh).toBeUndefined();
  });

  it('records restoredFrom and waits for refresh on restore', async () => {
    const client = getClient({ title: 'Old' } as DashboardState);
    mockedGetClient.mockReturnValue(client as never);
    await addToHistory({
      ...baseArgs,
      ctx: getContext(),
      sequence: 5,
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
      addToHistory({ ...baseArgs, ctx: getContext(), sequence: 1 })
    ).resolves.toBeUndefined();
  });
});

describe('getHistorySnapshot', () => {
  const args = {
    attributes: {} as never,
    references: [],
    strictValidationSchema: {} as never,
  };

  it('transforms the stored state using the dashboard-app panel format', () => {
    (transformDashboardOut as jest.Mock).mockReturnValue({
      dashboardState: { title: 'New' },
      warnings: [],
    });
    const snapshot = getHistorySnapshot(args);

    expect(transformDashboardOut).toHaveBeenCalledWith(
      args.attributes,
      args.references,
      true,
      args.strictValidationSchema
    );
    expect(snapshot).toEqual({ title: 'New' });
  });

  it('returns undefined when the state cannot be transformed', () => {
    (transformDashboardOut as jest.Mock).mockImplementation(() => {
      throw new Error('bad panel');
    });
    expect(getHistorySnapshot(args)).toBeUndefined();
  });
});
