/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { COMMENTS_API_PATH } from '../../common/comments';
import type { CommentsClient } from './comments_client';
import { CommentsLimitError } from './limit_error';
import { registerCommentsRoutes } from './routes';

describe('comments routes', () => {
  const router = httpServiceMock.createRouter();
  const client = {
    create: jest.fn(),
    update: jest.fn(),
    importAll: jest.fn(),
  } as unknown as jest.Mocked<CommentsClient>;
  registerCommentsRoutes(router, Promise.resolve(client));

  const handler = (method: 'post' | 'patch', path: string): RequestHandler => {
    const registration = router[method].mock.calls.find(([config]) => config.path === path);
    if (!registration) {
      throw new Error(`No ${method} route at ${path}`);
    }
    return registration[1] as RequestHandler;
  };

  const call = async (method: 'post' | 'patch', path: string, body: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    await handler(method, path)(
      {} as never,
      httpServerMock.createKibanaRequest({ params: { id: 'a' }, body }),
      response
    );
    return response;
  };

  it('turns limit violations into bad requests the user can act on', async () => {
    client.create.mockRejectedValueOnce(new CommentsLimitError('Store is full'));
    const response = await call('post', COMMENTS_API_PATH, {});

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'Store is full' } });
  });

  it('adds the records the import could not read to those it could not write', async () => {
    client.importAll.mockResolvedValueOnce({ imported: 1, skipped: 0, failed: 1 });
    const response = await call('post', `${COMMENTS_API_PATH}/import`, {
      version: 2,
      exportedAt: '2026-01-01T00:00:00.000Z',
      comments: [{}, {}, {}],
    });

    expect(response.ok).toHaveBeenCalledWith({ body: { imported: 1, skipped: 3, failed: 1 } });
  });

  it('lets other failures through', async () => {
    client.update.mockRejectedValueOnce(new Error('cluster down'));

    await expect(call('patch', `${COMMENTS_API_PATH}/{id}`, {})).rejects.toThrow('cluster down');
  });
});
