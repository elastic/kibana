/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import { CoreSetup, RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { registerResolveIndexRoute } from './resolve_index';

const mockResponseIndices = {
  indices: [
    {
      name: 'kibana_sample_data_logs',
      attributes: ['open'],
    },
  ],
  aliases: [],
  data_streams: [],
};

const mockResponseEmpty = {
  indices: [],
  aliases: [],
  data_streams: [],
};

const mockError403 = {
  meta: {
    body: {
      error: {
        root_cause: [
          {
            type: 'no_such_remote_cluster_exception',
            reason: 'no such remote cluster: [cluster1]',
          },
        ],
        type: 'security_exception',
        reason:
          'action [indices:admin/resolve/index] is unauthorized for user [elastic] with effective roles [superuser], this action is granted by the index privileges [view_index_metadata,manage,read,all]',
        caused_by: {
          type: 'no_such_remote_cluster_exception',
          reason: 'no such remote cluster: [cluster1]',
        },
      },
      status: 403,
    },
    statusCode: 403,
  },
};

const mockError404 = {
  meta: {
    body: {
      error: {
        root_cause: [
          {
            type: 'index_not_found_exception',
            reason: 'no such index [asdf]',
            'resource.type': 'index_or_alias',
            'resource.id': 'asdf',
            index_uuid: '_na_',
            index: 'asdf',
          },
        ],
        type: 'index_not_found_exception',
        reason: 'no such index [asdf]',
        'resource.type': 'index_or_alias',
        'resource.id': 'asdf',
        index_uuid: '_na_',
        index: 'asdf',
      },
      status: 404,
    },
    statusCode: 404,
  },
};

describe('resolve_index route', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
  });

  it('handler calls /_resolve/index with the given request', async () => {
    const mockClient = {
      indices: {
        resolveIndex: jest.fn().mockResolvedValue(mockResponseIndices),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockRequest = httpServerMock.createKibanaRequest({
      params: {
        query: 'kibana_sample_data_logs',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerResolveIndexRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.indices.resolveIndex.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "expand_wildcards": "open",
        "name": "kibana_sample_data_logs",
      }
    `);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: mockResponseIndices });
  });

  it('should return 200 for a search for indices with wildcard', async () => {
    const mockClient = {
      indices: {
        resolveIndex: jest.fn().mockResolvedValue(mockResponseEmpty),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockRequest = httpServerMock.createKibanaRequest({
      params: {
        query: 'asdf*',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerResolveIndexRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.indices.resolveIndex.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "expand_wildcards": "open",
        "name": "asdf*",
      }
    `);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: mockResponseEmpty });
  });

  it('returns 404 when hitting a 403 from Elasticsearch', async () => {
    const mockClient = {
      indices: {
        resolveIndex: jest.fn().mockRejectedValue(mockError403),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockRequest = httpServerMock.createKibanaRequest({
      params: {
        query: 'cluster1:filebeat-*,cluster2:filebeat-*',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerResolveIndexRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];

    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.indices.resolveIndex.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "expand_wildcards": "open",
        "name": "cluster1:filebeat-*,cluster2:filebeat-*",
      }
    `);

    expect(mockResponse.notFound).toBeCalled();
    expect(mockResponse.notFound.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "action [indices:admin/resolve/index] is unauthorized for user [elastic] with effective roles [superuser], this action is granted by the index privileges [view_index_metadata,manage,read,all]",
        },
      }
    `);
  });

  it('returns 404 when hitting a 404 from Elasticsearch', async () => {
    const mockClient = {
      indices: {
        resolveIndex: jest.fn().mockRejectedValue(mockError404),
      },
    };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockRequest = httpServerMock.createKibanaRequest({
      params: {
        query: 'asdf',
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerResolveIndexRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.get.mock.calls[0][1];

    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.indices.resolveIndex.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "expand_wildcards": "open",
        "name": "asdf",
      }
    `);

    expect(mockResponse.notFound).toBeCalled();
    expect(mockResponse.notFound.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "message": "no such index [asdf]",
        },
      }
    `);
  });
});
