/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';

import { registerHistoryListRoute } from './register_list_route';
import { getChangeHistoryContext } from './route_utils';

jest.mock('./route_utils', () => ({
  ...jest.requireActual('./route_utils'),
  getChangeHistoryContext: jest.fn(),
}));

const mockedGetContext = getChangeHistoryContext as jest.Mock;

const getItem = (
  id: string,
  overrides: { user?: { name: string; id?: string }; metadata?: Record<string, unknown> } = {}
) => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  user: { name: `name-${id}`, id: `uid-${id}` },
  event: { id, action: 'dashboard_update' },
  object: { sequence: Number(id.replace('c', '')), snapshot: {} },
  ...overrides,
});

const setup = () => {
  const bulkGet = jest.fn().mockResolvedValue([]);
  const coreSetup = {
    getStartServices: jest.fn().mockResolvedValue([{ userProfile: { bulkGet } }]),
  } as unknown as CoreSetup<never, never>;
  const router = httpServiceMock.createRouter();
  registerHistoryListRoute(coreSetup as never, router);
  expect(router.get).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/internal/dashboard/change_history/{id}' }),
    expect.any(Function)
  );
  return { handler: router.get.mock.calls[0][1], bulkGet };
};

const run = async (
  items: unknown[],
  query: { page?: number; per_page?: number } = {},
  total = items.length
) => {
  const { handler, bulkGet } = setup();
  const client = { getHistory: jest.fn().mockResolvedValue({ total, items }) };
  mockedGetContext.mockResolvedValue({ client, spaceId: 'my-space' });
  const res = httpServerMock.createResponseFactory();
  await handler(
    {} as never,
    httpServerMock.createKibanaRequest({ params: { id: 'dash-1' }, query }),
    res
  );
  return { res, client, bulkGet };
};

describe('list route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns the error response from the context check', async () => {
    const { handler } = setup();
    const error = { status: 503 };
    mockedGetContext.mockResolvedValue({ error });

    await expect(
      handler(
        {} as never,
        httpServerMock.createKibanaRequest(),
        httpServerMock.createResponseFactory()
      )
    ).resolves.toBe(error);
  });

  it('converts the 1-indexed page into an offset', async () => {
    const { client } = await run([], { page: 3, per_page: 10 });
    expect(client.getHistory).toHaveBeenCalledWith('my-space', 'dashboard', 'dash-1', {
      size: 10,
      from: 20,
    });
  });

  it('does not set an offset without a page size', async () => {
    const { client } = await run([]);
    expect(client.getHistory).toHaveBeenCalledWith('my-space', 'dashboard', 'dash-1', {
      size: undefined,
      from: undefined,
    });
  });

  it('skips the user profile lookup when no items have a user id', async () => {
    const { bulkGet, res } = await run([getItem('c1', { user: { name: 'system' } })]);
    expect(bulkGet).not.toHaveBeenCalled();
    expect(res.ok).toHaveBeenCalledTimes(1);
  });

  it('maps items, using the profile full name when available', async () => {
    const { handler, bulkGet } = setup();
    bulkGet.mockResolvedValue([{ uid: 'uid-c2', user: { full_name: 'Full Name' } }]);
    const client = {
      getHistory: jest.fn().mockResolvedValue({
        total: 2,
        items: [getItem('c2', { metadata: { changeCount: 3, restoredFrom: 1 } }), getItem('c1')],
      }),
    };
    mockedGetContext.mockResolvedValue({ client, spaceId: 'my-space' });
    const res = httpServerMock.createResponseFactory();
    await handler(
      {} as never,
      httpServerMock.createKibanaRequest({ params: { id: 'dash-1' } }),
      res
    );

    expect(bulkGet).toHaveBeenCalledWith({ uids: new Set(['uid-c2', 'uid-c1']) });
    const { body } = res.ok.mock.calls[0][0] as { body: { total: number; items: any[] } };
    expect(body.total).toBe(2);
    expect(body.items[0]).toEqual({
      id: 'c2',
      action: 'dashboard_update',
      isCurrent: true,
      timestamp: '2026-01-01T00:00:00.000Z',
      actor: { name: 'Full Name', id: 'uid-c2' },
      changes: { count: 3 },
      comment: 'Restored from v1',
      metadata: { version: 2 },
    });
    expect(body.items[1]).toEqual(
      expect.objectContaining({
        isCurrent: false,
        actor: { name: 'name-c1', id: 'uid-c1' },
        metadata: { version: 1 },
      })
    );
    expect(body.items[1]).not.toHaveProperty('changes');
    expect(body.items[1]).not.toHaveProperty('comment');
  });

  it('only flags the first item of the first page as current', async () => {
    const { res } = await run([getItem('c2'), getItem('c1')], { page: 2, per_page: 2 }, 4);
    const { body } = res.ok.mock.calls[0][0] as { body: { items: Array<{ isCurrent: boolean }> } };
    expect(body.items.map((item) => item.isCurrent)).toEqual([false, false]);
  });
});
