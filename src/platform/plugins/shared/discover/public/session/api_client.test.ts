/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHttpFetchError } from '@kbn/core-http-browser-mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../common/constants';
import { createDiscoverSessionClient } from './api_client';

describe('Discover session API client', () => {
  const data = { title: 'Session', tabs: [] };
  const response = {
    id: 'session-id',
    data: { ...data, description: '' },
    meta: { managed: false },
  };

  it('creates a session with the expected body and API version', async () => {
    const http = httpServiceMock.createStartContract();
    const client = createDiscoverSessionClient(http);
    http.post.mockResolvedValue(response);

    await expect(client.create(data)).resolves.toBe(response);
    expect(http.post).toHaveBeenCalledWith(DISCOVER_SESSION_API_BASE_PATH, {
      version: DISCOVER_SESSION_API_VERSION,
      body: JSON.stringify(data),
    });
  });

  it('gets a session with the expected path and API version', async () => {
    const http = httpServiceMock.createStartContract();
    const client = createDiscoverSessionClient(http);
    http.get.mockResolvedValue(response);

    await expect(client.get('session-id')).resolves.toBe(response);
    expect(http.get).toHaveBeenCalledWith(`${DISCOVER_SESSION_API_BASE_PATH}/session-id`, {
      version: DISCOVER_SESSION_API_VERSION,
    });
  });

  it('upserts a session with the expected path, body, and API version', async () => {
    const http = httpServiceMock.createStartContract();
    const client = createDiscoverSessionClient(http);
    http.put.mockResolvedValue(response);

    await expect(client.upsert('session-id', data)).resolves.toBe(response);
    expect(http.put).toHaveBeenCalledWith(`${DISCOVER_SESSION_API_BASE_PATH}/session-id`, {
      version: DISCOVER_SESSION_API_VERSION,
      body: JSON.stringify(data),
    });
  });

  it('converts a GET 404 into the error expected by Discover', async () => {
    const http = httpServiceMock.createStartContract();
    const client = createDiscoverSessionClient(http);
    http.get.mockRejectedValue(
      createHttpFetchError(
        'Not found',
        'NotFound',
        new Request('http://localhost'),
        new Response(undefined, { status: 404 })
      )
    );

    await expect(client.get('missing-session')).rejects.toBeInstanceOf(SavedObjectNotFound);
  });

  it('preserves GET errors that are not 404 responses', async () => {
    const http = httpServiceMock.createStartContract();
    const client = createDiscoverSessionClient(http);
    const error = new Error('Network error');
    http.get.mockRejectedValue(error);

    await expect(client.get('session-id')).rejects.toBe(error);
  });

  it.each([
    {
      operation: 'create',
      rejectRequest: (http: ReturnType<typeof httpServiceMock.createStartContract>) =>
        http.post.mockRejectedValue(createBadRequestError()),
      runRequest: (client: ReturnType<typeof createDiscoverSessionClient>) => client.create(data),
    },
    {
      operation: 'get',
      rejectRequest: (http: ReturnType<typeof httpServiceMock.createStartContract>) =>
        http.get.mockRejectedValue(createBadRequestError()),
      runRequest: (client: ReturnType<typeof createDiscoverSessionClient>) =>
        client.get('session-id'),
    },
    {
      operation: 'upsert',
      rejectRequest: (http: ReturnType<typeof httpServiceMock.createStartContract>) =>
        http.put.mockRejectedValue(createBadRequestError()),
      runRequest: (client: ReturnType<typeof createDiscoverSessionClient>) =>
        client.upsert('session-id', data),
    },
  ])(
    'uses the server error message when $operation fails',
    async ({ rejectRequest, runRequest }) => {
      const http = httpServiceMock.createStartContract();
      const client = createDiscoverSessionClient(http);
      rejectRequest(http);

      await expect(runRequest(client)).rejects.toThrow('chart_interval must be a supported value');
    }
  );
});

const createBadRequestError = () =>
  createHttpFetchError(
    'Bad Request',
    'Error',
    new Request('http://localhost'),
    new Response(undefined, { status: 400, statusText: 'Bad Request' }),
    { message: 'chart_interval must be a supported value', statusCode: 400 }
  );
