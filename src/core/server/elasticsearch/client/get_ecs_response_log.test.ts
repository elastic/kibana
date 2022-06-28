/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { type DiagnosticResult, type ConnectionRequestParams } from '@elastic/elasticsearch';
import { getEcsResponseLog } from './get_ecs_response_log';

interface ResponseFixtureOptions {
  requestParams?: Partial<ConnectionRequestParams>;

  response?: {
    body?: any;
    headers?: Record<string, string | string[]>;
    statusCode?: number;
  };
}

function createResponseEvent({
  requestParams = {},
  response = {},
}: ResponseFixtureOptions = {}): DiagnosticResult {
  return {
    body: response.body ?? {},
    statusCode: response.statusCode ?? 200,
    headers: response.headers ?? {},
    meta: {
      request: {
        params: {
          headers: requestParams.headers ?? { 'content-length': '123' },
          method: requestParams.method ?? 'get',
          path: requestParams.path ?? '/path',
          querystring: requestParams.querystring ?? '?wait_for_completion=true',
        },
        options: {
          id: '42',
        },
      } as DiagnosticResult['meta']['request'],
    } as DiagnosticResult['meta'],
    warnings: null,
  };
}

describe('getEcsResponseLog', () => {
  describe('filters sensitive headers', () => {
    test('redacts Authorization and Cookie headers by default', () => {
      const event = createResponseEvent({
        requestParams: { headers: { authorization: 'a', cookie: 'b', 'user-agent': 'hi' } },
        response: { headers: { 'content-length': '123', 'set-cookie': 'c' } },
      });
      const log = getEcsResponseLog(event);
      // @ts-expect-error ECS custom field
      expect(log.http.request.headers).toMatchInlineSnapshot(`
        Object {
          "authorization": "[REDACTED]",
          "cookie": "[REDACTED]",
          "user-agent": "hi",
        }
      `);
      // @ts-expect-error ECS custom field
      expect(log.http.response.headers).toMatchInlineSnapshot(`
        Object {
          "content-length": "123",
          "set-cookie": "[REDACTED]",
        }
      `);
    });

    test('does not mutate original headers', () => {
      const reqHeaders = { a: 'foo', b: ['hello', 'world'] };
      const resHeaders = { c: 'bar' };
      const event = createResponseEvent({
        requestParams: { headers: reqHeaders },
        response: { headers: resHeaders },
      });

      const log = getEcsResponseLog(event);
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
          "c": "bar",
        }
      `);

      // @ts-expect-error ECS custom field
      log.http.request.headers.a = 'testA';
      // @ts-expect-error ECS custom field
      log.http.request.headers.b[1] = 'testB';
      // @ts-expect-error ECS custom field
      log.http.request.headers.c = 'testC';
      expect(reqHeaders).toMatchInlineSnapshot(`
        Object {
          "a": "foo",
          "b": Array [
            "hello",
            "testB",
          ],
        }
      `);
      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "c": "bar",
        }
      `);
    });

    test('does not mutate original headers when redacting sensitive data', () => {
      const reqHeaders = { authorization: 'a', cookie: 'b', 'user-agent': 'hi' };
      const resHeaders = { 'content-length': '123', 'set-cookie': 'c' };
      const event = createResponseEvent({
        requestParams: { headers: reqHeaders },
        response: { headers: resHeaders },
      });
      getEcsResponseLog(event);

      expect(reqHeaders).toMatchInlineSnapshot(`
          Object {
            "authorization": "a",
            "cookie": "b",
            "user-agent": "hi",
          }
        `);
      expect(resHeaders).toMatchInlineSnapshot(`
          Object {
            "content-length": "123",
            "set-cookie": "c",
          }
        `);
    });
  });

  describe('ecs', () => {
    test('provides an ECS-compatible response', () => {
      const event = createResponseEvent();
      const result = getEcsResponseLog(event, 123);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "request": Object {
              "headers": Object {
                "content-length": "123",
              },
              "id": undefined,
              "method": "GET",
            },
            "response": Object {
              "body": Object {
                "bytes": 123,
              },
              "headers": Object {},
              "status_code": 200,
            },
          },
          "url": Object {
            "path": "/path",
            "query": "?wait_for_completion=true",
          },
        }
      `);
    });
  });
});
