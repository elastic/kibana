/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { registerHasDataViewsRoute } from './has_data_views';

describe('preview has_data_views route', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
  });

  it('should send hasDataView: true, hasUserDataView: true when data view exists', async () => {
    const mockESClientResolveIndexResponse = { indices: [], aliases: [], data_streams: [] };
    const mockSOClientFindResponse = {
      page: 1,
      per_page: 100,
      total: 1,
      saved_objects: [
        {
          type: 'index-pattern',
          id: '12345',
          namespaces: ['default'],
          attributes: { title: 'sample_data_logs' },
        },
      ],
    };
    const mockESClient = {
      indices: {
        resolveIndex: jest.fn().mockResolvedValue(mockESClientResolveIndexResponse),
      },
    };
    const mockSOClient = { find: jest.fn().mockResolvedValue(mockSOClientFindResponse) };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
        savedObjects: { client: mockSOClient },
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerHasDataViewsRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockSOClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "fields": Array [
          "title",
        ],
        "perPage": 100,
        "search": "*",
        "searchFields": Array [
          "title",
        ],
        "type": "index-pattern",
      }
    `);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: { hasDataView: true, hasUserDataView: true },
    });
  });

  it('should send hasDataView: true, hasUserDataView: false when default data view exists', async () => {
    const mockESClientResolveIndexResponse = { indices: [], aliases: [], data_streams: [] };
    const mockSOClientFindResponse = {
      page: 1,
      per_page: 100,
      total: 1,
      saved_objects: [
        {
          type: 'index-pattern',
          id: '12345',
          namespaces: ['default'],
          attributes: { title: 'logs-*' },
        },
      ],
    };
    const mockESClient = {
      indices: {
        resolveIndex: jest.fn().mockResolvedValue(mockESClientResolveIndexResponse),
      },
    };
    const mockSOClient = { find: jest.fn().mockResolvedValue(mockSOClientFindResponse) };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockESClient } },
        savedObjects: { client: mockSOClient },
      },
    };

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerHasDataViewsRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockSOClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "fields": Array [
          "title",
        ],
        "perPage": 100,
        "search": "*",
        "searchFields": Array [
          "title",
        ],
        "type": "index-pattern",
      }
    `);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: { hasDataView: true, hasUserDataView: false },
    });
  });
});
