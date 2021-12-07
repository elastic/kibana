/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request } from '@hapi/hapi';
import Boom from '@hapi/boom';
import { loggerMock, MockedLogger } from '../../logging/logger.mock';
import { getEcsResponseLog } from './get_response_log';

jest.mock('./get_payload_size', () => ({
  getResponsePayloadBytes: jest.fn().mockReturnValue(1234),
}));

import { getResponsePayloadBytes } from './get_payload_size';

interface RequestFixtureOptions {
  auth?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, any>;
  info?: Record<string, any>;
  method?: string;
  mime?: string;
  path?: string;
  query?: Record<string, any>;
  response?: Record<string, any> | Boom.Boom;
  app?: Record<string, any>;
}

function createMockHapiRequest({
  auth = { isAuthenticated: true },
  body = {},
  headers = { 'user-agent': '' },
  info = { referrer: 'localhost:5601/app/home' },
  method = 'get',
  mime = 'application/json',
  path = '/path',
  query = {},
  response = { headers: {}, statusCode: 200 },
  app = {},
}: RequestFixtureOptions = {}): Request {
  return {
    auth,
    body,
    headers,
    info,
    method,
    mime,
    path,
    query,
    response,
    app,
  } as unknown as Request;
}

describe('getEcsResponseLog', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();
  });

  test('provides correctly formatted message', () => {
    const req = createMockHapiRequest({
      info: {
        completed: 1610660232000,
        received: 1610660231000,
      },
    });
    const result = getEcsResponseLog(req, logger);
    expect(result.message).toMatchInlineSnapshot(`"GET /path 200 1000ms - 1.2KB"`);
  });

  describe('calculates responseTime', () => {
    test('with response.info.completed', () => {
      const req = createMockHapiRequest({
        info: {
          completed: 1610660232000,
          received: 1610660231000,
        },
      });
      const result = getEcsResponseLog(req, logger);
      // @ts-expect-error ECS custom field
      expect(result.meta.http.response.responseTime).toBe(1000);
    });

    test('with response.info.responded', () => {
      const req = createMockHapiRequest({
        info: {
          responded: 1610660233500,
          received: 1610660233000,
        },
      });
      const result = getEcsResponseLog(req, logger);
      // @ts-expect-error ECS custom field
      expect(result.meta.http.response.responseTime).toBe(500);
    });

    test('excludes responseTime from message if none is provided', () => {
      const req = createMockHapiRequest();
      const result = getEcsResponseLog(req, logger);
      expect(result.message).toMatchInlineSnapshot(`"GET /path 200 - 1.2KB"`);
      // @ts-expect-error ECS custom field
      expect(result.meta.http.response.responseTime).toBeUndefined();
    });
  });

  describe('handles request querystring', () => {
    test('correctly formats querystring', () => {
      const req = createMockHapiRequest({
        query: {
          a: 'hello',
          b: 'world',
        },
      });
      const result = getEcsResponseLog(req, logger);
      expect(result.meta.url!.query).toMatchInlineSnapshot(`"a=hello&b=world"`);
      expect(result.message).toMatchInlineSnapshot(`"GET /path?a=hello&b=world 200 - 1.2KB"`);
    });

    test('correctly encodes querystring', () => {
      const req = createMockHapiRequest({
        query: { a: '¡hola!' },
      });
      const result = getEcsResponseLog(req, logger);
      expect(result.meta.url!.query).toMatchInlineSnapshot(`"a=%C2%A1hola!"`);
      expect(result.message).toMatchInlineSnapshot(`"GET /path?a=%C2%A1hola! 200 - 1.2KB"`);
    });
  });

  test('calls getResponsePayloadBytes to calculate payload bytes', () => {
    const response = { headers: {}, source: '...' };
    const req = createMockHapiRequest({ response });
    getEcsResponseLog(req, logger);
    expect(getResponsePayloadBytes).toHaveBeenCalledWith(response, logger);
  });

  test('excludes payload bytes from message if unavailable', () => {
    (getResponsePayloadBytes as jest.Mock).mockReturnValueOnce(undefined);
    const req = createMockHapiRequest();
    const result = getEcsResponseLog(req, logger);
    expect(result.message).toMatchInlineSnapshot(`"GET /path 200"`);
  });

  test('set traceId stored in the request app storage', () => {
    const req = createMockHapiRequest({
      app: {
        foo: 'bar',
        traceId: 'trace_id',
      },
    });
    const result = getEcsResponseLog(req, logger);
    expect(result.meta?.trace?.id).toBe('trace_id');
  });

  test('handles Boom errors in the response', () => {
    const req = createMockHapiRequest({
      response: Boom.badRequest(),
    });
    const result = getEcsResponseLog(req, logger);
    expect(result.meta.http!.response!.status_code).toBe(400);
  });

  describe('filters sensitive headers', () => {
    test('redacts Authorization and Cookie headers by default', () => {
      const req = createMockHapiRequest({
        headers: { authorization: 'a', cookie: 'b', 'user-agent': 'hi' },
        response: { headers: { 'content-length': 123, 'set-cookie': 'c' } },
      });
      const result = getEcsResponseLog(req, logger);
      // @ts-expect-error ECS custom field
      expect(result.meta.http.request.headers).toMatchInlineSnapshot(`
        Object {
          "authorization": "[REDACTED]",
          "cookie": "[REDACTED]",
          "user-agent": "hi",
        }
      `);
      // @ts-expect-error ECS custom field
      expect(result.meta.http.response.headers).toMatchInlineSnapshot(`
        Object {
          "content-length": 123,
          "set-cookie": "[REDACTED]",
        }
      `);
    });

    test('does not mutate original headers', () => {
      const reqHeaders = { a: 'foo', b: ['hello', 'world'] };
      const resHeaders = { headers: { c: 'bar' } };
      const req = createMockHapiRequest({
        headers: reqHeaders,
        response: { headers: resHeaders },
      });

      const responseLog = getEcsResponseLog(req, logger);
      expect(reqHeaders).toMatchInlineSnapshot(`
        Object {
          "a": "foo",
          "b": Array [
            "hello",
            "world",
          ],
        }
      `);
      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "c": "bar",
          },
        }
      `);

      // @ts-expect-error ECS custom field
      responseLog.meta.http.request.headers.a = 'testA';
      // @ts-expect-error ECS custom field
      responseLog.meta.http.request.headers.b[1] = 'testB';
      // @ts-expect-error ECS custom field
      responseLog.meta.http.request.headers.c = 'testC';
      expect(reqHeaders).toMatchInlineSnapshot(`
        Object {
          "a": "foo",
          "b": Array [
            "hello",
            "world",
          ],
        }
      `);
      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "c": "bar",
          },
        }
      `);
    });

    test('does not mutate original headers when redacting sensitive data', () => {
      const reqHeaders = { authorization: 'a', cookie: 'b', 'user-agent': 'hi' };
      const resHeaders = { headers: { 'content-length': 123, 'set-cookie': 'c' } };
      const req = createMockHapiRequest({
        headers: reqHeaders,
        response: { headers: resHeaders },
      });
      getEcsResponseLog(req, logger);
      expect(reqHeaders).toMatchInlineSnapshot(`
        Object {
          "authorization": "a",
          "cookie": "b",
          "user-agent": "hi",
        }
      `);
      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "content-length": 123,
            "set-cookie": "c",
          },
        }
      `);
    });
  });

  describe('ecs', () => {
    test('provides an ECS-compatible response', () => {
      const req = createMockHapiRequest();
      const result = getEcsResponseLog(req, logger);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "GET /path 200 - 1.2KB",
          "meta": Object {
            "client": Object {
              "ip": undefined,
            },
            "http": Object {
              "request": Object {
                "headers": Object {
                  "user-agent": "",
                },
                "method": "GET",
                "mime_type": "application/json",
                "referrer": "localhost:5601/app/home",
              },
              "response": Object {
                "body": Object {
                  "bytes": 1234,
                },
                "headers": Object {},
                "responseTime": undefined,
                "status_code": 200,
              },
            },
            "trace": undefined,
            "url": Object {
              "path": "/path",
              "query": "",
            },
            "user_agent": Object {
              "original": "",
            },
          },
        }
      `);
    });
  });
});
