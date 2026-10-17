/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';

import { update } from '../api/update/update';
import { registerRestoreChangeRoute } from './register_restore_route';
import { getChangeHistoryContext } from './route_utils';

jest.mock('../api/update/update');
jest.mock('./route_utils', () => ({
  ...jest.requireActual('./route_utils'),
  getChangeHistoryContext: jest.fn(),
}));

const mockedGetContext = getChangeHistoryContext as jest.Mock;
const mockedUpdate = update as jest.MockedFunction<typeof update>;

const getHandler = () => {
  const router = httpServiceMock.createRouter();
  registerRestoreChangeRoute(router);
  expect(router.post).toHaveBeenCalledWith(
    expect.objectContaining({
      path: '/internal/dashboard/change_history/{id}/{changeId}/_restore',
    }),
    expect.any(Function)
  );
  return router.post.mock.calls[0][1];
};

const request = () =>
  httpServerMock.createKibanaRequest({
    method: 'post',
    params: { id: 'dash-1', changeId: 'c2' },
  });

describe('restore route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns the error response from the context check', async () => {
    const error = { status: 403 };
    mockedGetContext.mockResolvedValue({ error });

    await expect(
      getHandler()({} as never, request(), httpServerMock.createResponseFactory())
    ).resolves.toBe(error);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the change does not exist', async () => {
    const client = { getHistory: jest.fn().mockResolvedValue({ items: [] }) };
    mockedGetContext.mockResolvedValue({ client, spaceId: 'my-space' });
    const res = httpServerMock.createResponseFactory();

    await getHandler()({} as never, request(), res);

    expect(res.notFound).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('updates the dashboard with the snapshot and records the restored version', async () => {
    const snapshot = { title: 'Old title' };
    const client = {
      getHistory: jest.fn().mockResolvedValue({ items: [{ object: { snapshot, sequence: 2 } }] }),
    };
    mockedGetContext.mockResolvedValue({ client, spaceId: 'my-space' });
    mockedUpdate.mockResolvedValue({
      body: { data: { title: 'Old title' } },
      operation: 'update',
    } as never);
    const ctx = {} as never;
    const res = httpServerMock.createResponseFactory();

    await getHandler()(ctx, request(), res);

    expect(client.getHistory).toHaveBeenCalledWith('my-space', 'dashboard', 'dash-1', {
      additionalFilters: [{ term: { 'event.id': 'c2' } }],
      size: 1,
    });
    expect(mockedUpdate).toHaveBeenCalledWith(ctx, expect.anything(), 'dash-1', snapshot, {
      spaceId: 'my-space',
      isDashboardAppRequest: true,
      restoredFrom: 2,
    });
    expect(res.ok).toHaveBeenCalledWith({ body: { title: 'Old title' } });
  });
});
