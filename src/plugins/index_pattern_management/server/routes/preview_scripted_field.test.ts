/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, RequestHandlerContext } from 'src/core/server';
import { coreMock, httpServerMock } from '../../../../../src/core/server/mocks';
import { registerPreviewScriptedFieldRoute } from './preview_scripted_field';

describe('preview_scripted_field route', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
  });

  it('handler calls /_search with the given request', async () => {
    const response = { body: { responses: [{ hits: { _id: 'hi' } }] } };
    const mockClient = { search: jest.fn().mockResolvedValue(response) };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockBody = {
      index: 'kibana_sample_data_logs',
      name: 'my_scripted_field',
      script: `doc['foo'].value`,
    };
    const mockQuery = {};
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      query: mockQuery,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerPreviewScriptedFieldRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.search.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": undefined,
          "query": Object {
            "match_all": Object {},
          },
          "script_fields": Object {
            "my_scripted_field": Object {
              "script": Object {
                "lang": "painless",
                "source": "doc['foo'].value",
              },
            },
          },
          "size": 10,
          "timeout": "30s",
        },
        "index": "kibana_sample_data_logs",
      }
    `);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: response });
  });

  it('uses optional parameters when they are provided', async () => {
    const response = { body: { responses: [{ hits: { _id: 'hi' } }] } };
    const mockClient = { search: jest.fn().mockResolvedValue(response) };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockBody = {
      index: 'kibana_sample_data_logs',
      name: 'my_scripted_field',
      script: `doc['foo'].value`,
      query: {
        bool: { some: 'query' },
      },
      additionalFields: ['a', 'b', 'c'],
    };
    const mockQuery = {};
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      query: mockQuery,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerPreviewScriptedFieldRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.search.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "_source": Array [
            "a",
            "b",
            "c",
          ],
          "query": Object {
            "bool": Object {
              "some": "query",
            },
          },
          "script_fields": Object {
            "my_scripted_field": Object {
              "script": Object {
                "lang": "painless",
                "source": "doc['foo'].value",
              },
            },
          },
          "size": 10,
          "timeout": "30s",
        },
        "index": "kibana_sample_data_logs",
      }
    `);
  });

  it('handler throws an error if the search throws an error', async () => {
    const response = {
      statusCode: 400,
      message: 'oops',
    };
    const mockClient = { search: jest.fn().mockReturnValue(Promise.reject(response)) };
    const mockContext = {
      core: {
        elasticsearch: { client: { asCurrentUser: mockClient } },
      },
    };
    const mockBody = { searches: [{ header: {}, body: {} }] };
    const mockQuery = {};
    const mockRequest = httpServerMock.createKibanaRequest({
      body: mockBody,
      query: mockQuery,
    });
    const mockResponse = httpServerMock.createResponseFactory();

    registerPreviewScriptedFieldRoute(mockCoreSetup.http.createRouter());

    const mockRouter = mockCoreSetup.http.createRouter.mock.results[0].value;
    const handler = mockRouter.post.mock.calls[0][1];
    await handler(mockContext as unknown as RequestHandlerContext, mockRequest, mockResponse);

    expect(mockClient.search).toBeCalled();
    expect(mockResponse.customError).toBeCalled();

    const error: any = mockResponse.customError.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.body).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "error": "oops",
        },
        "message": "oops",
      }
    `);
  });
});
