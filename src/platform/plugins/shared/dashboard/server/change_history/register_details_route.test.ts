/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';

import { registerChangeDetailsRoute } from './register_details_route';
import { getChangeHistoryContext } from './route_utils';

jest.mock('./route_utils', () => ({
  ...jest.requireActual('./route_utils'),
  getChangeHistoryContext: jest.fn(),
}));

const mockedGetContext = getChangeHistoryContext as jest.Mock;

const getHandler = () => {
  const router = httpServiceMock.createRouter();
  registerChangeDetailsRoute(router);
  expect(router.get).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/internal/dashboard/change_history/{id}/{changeId}' }),
    expect.any(Function)
  );
  return router.get.mock.calls[0][1];
};

const getItem = (id: string) => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  user: { name: 'Hannah', id: 'u_1' },
  event: { id, action: 'dashboard_update' },
  object: { snapshot: { title: `Snapshot ${id}` } },
});

const runHandler = async (client: unknown) => {
  mockedGetContext.mockResolvedValue({ client, spaceId: 'my-space' });
  const res = httpServerMock.createResponseFactory();
  await getHandler()(
    {} as never,
    httpServerMock.createKibanaRequest({ params: { id: 'dash-1', changeId: 'c2' } }),
    res
  );
  return res;
};

describe('details route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns the error response from the context check', async () => {
    const error = { status: 403 };
    mockedGetContext.mockResolvedValue({ error });
    const res = httpServerMock.createResponseFactory();

    await expect(
      getHandler()({} as never, httpServerMock.createKibanaRequest(), res)
    ).resolves.toBe(error);
  });

  it('returns 404 when the change does not exist', async () => {
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    const res = await runHandler(client);

    expect(res.notFound).toHaveBeenCalledTimes(1);
    expect(res.ok).not.toHaveBeenCalled();
  });

  it('returns the change and flags the latest change as current', async () => {
    const client = {
      getHistory: jest
        .fn()
        // requested change, then the latest change
        .mockResolvedValueOnce({ items: [getItem('c2')] })
        .mockResolvedValueOnce({ items: [getItem('c2')] }),
    };
    const res = await runHandler(client);

    expect(client.getHistory).toHaveBeenCalledWith('my-space', 'dashboard', 'dash-1', {
      additionalFilters: [{ term: { 'event.id': 'c2' } }],
      size: 1,
    });
    expect(client.getHistory).toHaveBeenCalledWith('my-space', 'dashboard', 'dash-1', { size: 1 });
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'c2',
        timestamp: '2026-01-01T00:00:00.000Z',
        actor: { name: 'Hannah', id: 'u_1' },
        action: 'dashboard_update',
        snapshot: { title: 'Snapshot c2' },
        isCurrent: true,
      },
    });
  });

  it('does not flag older changes as current', async () => {
    const client = {
      getHistory: jest
        .fn()
        .mockResolvedValueOnce({ items: [getItem('c1')] })
        .mockResolvedValueOnce({ items: [getItem('c2')] }),
    };
    const res = await runHandler(client);

    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ isCurrent: false }),
    });
  });
});
