/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequestEvent } from '@elastic/elasticsearch';
import type { TransportRequestParams } from '@elastic/elasticsearch/lib/Transport';
import { getEcsResponseLog } from './get_ecs_response_log';

interface ResponseFixtureOptions {
  requestParams?: Partial<TransportRequestParams>;

  response?: {
    body?: any;
    headers?: Record<string, string | string[]>;
    statusCode?: number;
  };
}

function createResponseEvent({
  requestParams = {},
  response = {},
}: ResponseFixtureOptions = {}): RequestEvent {
  return {
    body: response.body ?? {},
    statusCode: response.statusCode ?? 200,
    headers: response.headers ?? {},
    meta: {
      request: {
        params: {
          method: requestParams.method ?? 'get',
          path: requestParams.path ?? '/path',
          querystring: requestParams.querystring ?? '?wait_for_completion=true',
        },
        options: {
          id: '42',
        },
        id: '42',
      } as RequestEvent['meta']['request'],
    } as RequestEvent['meta'],
    warnings: null,
  };
}

describe('getEcsResponseLog', () => {
  describe('filters sensitive headers', () => {
    test('redacts Authorization and Cookie headers by default', () => {
      const event = createResponseEvent({
        response: { headers: { 'content-length': '123', 'set-cookie': 'c' } },
      });
      const log = getEcsResponseLog(event);

      // @ts-expect-error ECS custom field
      expect(log.http.response.headers).toMatchInlineSnapshot(`
        Object {
          "content-length": "123",
          "set-cookie": "[REDACTED]",
        }
      `);
    });

    test('does not mutate original headers', () => {
      const resHeaders = { c: 'bar' };
      const event = createResponseEvent({
        response: { headers: resHeaders },
      });

      const log = getEcsResponseLog(event);

      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "c": "bar",
        }
      `);

      // @ts-expect-error ECS custom field
      log.http.response.headers.c = 'testC';
      expect(resHeaders).toMatchInlineSnapshot(`
        Object {
          "c": "bar",
        }
      `);
    });

    test('does not mutate original headers when redacting sensitive data', () => {
      const resHeaders = { 'content-length': '123', 'set-cookie': 'c' };
      const event = createResponseEvent({
        response: { headers: resHeaders },
      });
      getEcsResponseLog(event);

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
          },
        }
      `);
    });
  });
});
