/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { VIEWS_BULK_DELETE_ROUTE, VIEWS_ROUTE } from '@kbn/esql-types';
import { createEsqlViewsClient, EsqlViewsClientError } from './esql_views_client';

const createHttpError = (status: number, message: string) => {
  const error = new Error(message);
  Object.assign(error, {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body: { message },
  });
  return error;
};

const createHttpMock = () => {
  const get = jest.fn();
  const put = jest.fn();
  const deleteRequest = jest.fn();
  const post = jest.fn();
  const http = {
    get,
    put,
    delete: deleteRequest,
    post,
  } as unknown as HttpStart;

  return { http, get, put, deleteRequest, post };
};

describe('createEsqlViewsClient', () => {
  it('gets all views', async () => {
    const { http, get } = createHttpMock();
    const response = { views: [{ name: 'my-view', query: 'FROM logs-*' }] };
    get.mockResolvedValue(response);

    await expect(createEsqlViewsClient(http).getViews()).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith(VIEWS_ROUTE, { signal: undefined });
  });

  it('gets a view using an encoded name', async () => {
    const { http, get } = createHttpMock();
    const view = { name: 'view/name', query: 'ROW value = 1' };
    get.mockResolvedValue(view);

    await expect(createEsqlViewsClient(http).getView('view/name')).resolves.toEqual(view);
    expect(get).toHaveBeenCalledWith('/internal/esql/views/view%2Fname', {
      signal: undefined,
    });
  });

  it('returns undefined when a view does not exist', async () => {
    const { http, get } = createHttpMock();
    get.mockRejectedValue(createHttpError(404, 'Not found'));

    await expect(createEsqlViewsClient(http).getView('missing-view')).resolves.toBeUndefined();
  });

  it('creates a view after an exact-name preflight returns 404', async () => {
    const { http, get, put } = createHttpMock();
    get.mockRejectedValue(createHttpError(404, 'Not found'));
    put.mockResolvedValue({ acknowledged: true });
    const client = createEsqlViewsClient(http);

    await expect(
      client.createView({
        name: 'my-view',
        query: 'FROM logs-*',
        description: 'Logs',
      })
    ).resolves.toEqual({ acknowledged: true });
    expect(put).toHaveBeenCalledWith('/internal/esql/views/my-view', {
      body: JSON.stringify({
        query: 'FROM logs-*',
        description: 'Logs',
      }),
    });
  });

  it('rejects create when the view already exists', async () => {
    const { http, get, put } = createHttpMock();
    get.mockResolvedValue({ name: 'my-view', query: 'FROM logs-*' });

    await expect(
      createEsqlViewsClient(http).createView({
        name: 'my-view',
        query: 'FROM new-logs-*',
      })
    ).rejects.toMatchObject({
      name: 'EsqlViewsClientError',
      statusCode: 409,
    });
    expect(put).not.toHaveBeenCalled();
  });

  it('preserves a non-404 preflight error', async () => {
    const { http, get, put } = createHttpMock();
    get.mockRejectedValue(createHttpError(403, 'Forbidden'));

    await expect(
      createEsqlViewsClient(http).createView({
        name: 'my-view',
        query: 'FROM logs-*',
      })
    ).rejects.toMatchObject({
      message: 'Forbidden',
      statusCode: 403,
    });
    expect(put).not.toHaveBeenCalled();
  });

  it('updates a view without an existence preflight', async () => {
    const { http, get, put } = createHttpMock();
    put.mockResolvedValue({ acknowledged: true });

    await expect(
      createEsqlViewsClient(http).updateView({
        name: 'my-view',
        query: 'FROM updated-logs-*',
      })
    ).resolves.toEqual({ acknowledged: true });
    expect(get).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith('/internal/esql/views/my-view', {
      body: JSON.stringify({
        query: 'FROM updated-logs-*',
      }),
    });
  });

  it('uses DELETE for one view', async () => {
    const { http, deleteRequest } = createHttpMock();
    deleteRequest.mockResolvedValue({ acknowledged: true });

    await expect(createEsqlViewsClient(http).deleteViews(['my-view'])).resolves.toEqual({
      acknowledged: true,
    });
    expect(deleteRequest).toHaveBeenCalledWith('/internal/esql/views/my-view');
  });

  it('uses the bulk endpoint for multiple views', async () => {
    const { http, post } = createHttpMock();
    post.mockResolvedValue({ acknowledged: true });

    await expect(
      createEsqlViewsClient(http).deleteViews(['first-view', 'second-view'])
    ).resolves.toEqual({ acknowledged: true });
    expect(post).toHaveBeenCalledWith(VIEWS_BULK_DELETE_ROUTE, {
      body: JSON.stringify({ names: ['first-view', 'second-view'] }),
    });
  });

  it('rejects an empty delete request', async () => {
    const { http } = createHttpMock();

    await expect(createEsqlViewsClient(http).deleteViews([])).rejects.toEqual(
      new EsqlViewsClientError('At least one ES|QL view name is required', 400)
    );
  });
});
