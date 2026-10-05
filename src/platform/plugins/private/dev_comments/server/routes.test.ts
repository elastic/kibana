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
import { COMMENTS_API_PATH } from '../common';
import type { CommentsClient } from './comments_client';
import { CommentsLimitError } from './limit_error';
import { registerCommentsRoutes } from './routes';

describe('comments routes', () => {
  const router = httpServiceMock.createRouter();
  const client = {
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<CommentsClient>;
  registerCommentsRoutes(router, Promise.resolve(client));

  type Method = 'get' | 'post' | 'patch';

  const handler = (method: Method, path: string): RequestHandler => {
    const registration = router[method].mock.calls.find(([config]) => config.path === path);
    if (!registration) {
      throw new Error(`No ${method} route at ${path}`);
    }
    return registration[1] as RequestHandler;
  };

  const call = async (method: Method, path: string, body?: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    await handler(method, path)(
      {} as never,
      httpServerMock.createKibanaRequest({ params: { id: 'a' }, body }),
      response
    );
    return response;
  };

  it('answers for one comment, or that there is none', async () => {
    const comment = { id: 'a', text: 'Hello' };
    client.get.mockResolvedValueOnce(comment as never);
    const found = await call('get', `${COMMENTS_API_PATH}/{id}`);
    expect(client.get).toHaveBeenCalledWith('a');
    expect(found.ok).toHaveBeenCalledWith({ body: comment });

    client.get.mockResolvedValueOnce(undefined);
    const missing = await call('get', `${COMMENTS_API_PATH}/{id}`);
    expect(missing.notFound).toHaveBeenCalled();
  });

  it('turns limit violations into bad requests the user can act on', async () => {
    client.create.mockRejectedValueOnce(new CommentsLimitError('Store is full'));
    const response = await call('post', COMMENTS_API_PATH, {});

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'Store is full' } });
  });

  it('lets other failures through', async () => {
    client.update.mockRejectedValueOnce(new Error('cluster down'));

    await expect(call('patch', `${COMMENTS_API_PATH}/{id}`, {})).rejects.toThrow('cluster down');
  });
});
