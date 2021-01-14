/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { Request } from '@hapi/hapi';
import { Boom } from '@hapi/boom';
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
  response?: Record<string, any> | Boom;
}

function createMockHapiRequest({
  auth = { isAuthenticated: true },
  body = {},
  headers = { ['user-agent']: '' },
  info = { referrer: 'localhost:5601/app/home' },
  method = 'get',
  mime = 'application/json',
  path = '/path',
  query = {},
  response = { statusCode: 200 },
}: RequestFixtureOptions = {}): Request {
  return ({
    auth,
    body,
    headers,
    info,
    method,
    mime,
    path,
    query,
    response,
  } as unknown) as Request;
}

describe('getEcsResponseLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provides correctly formatted message', () => {
    const req = createMockHapiRequest({
      info: {
        completed: 1610660232000,
        received: 1610660231000,
      },
    });
    const result = getEcsResponseLog(req);
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
      const result = getEcsResponseLog(req);
      expect(result.http.response.responseTime).toBe(1000);
    });

    test('with response.info.responded', () => {
      const req = createMockHapiRequest({
        info: {
          responded: 1610660233500,
          received: 1610660233000,
        },
      });
      const result = getEcsResponseLog(req);
      expect(result.http.response.responseTime).toBe(500);
    });

    test('excludes responseTime from message if none is provided', () => {
      const req = createMockHapiRequest();
      const result = getEcsResponseLog(req);
      expect(result.message).toMatchInlineSnapshot(`"GET /path 200 - 1.2KB"`);
      expect(result.http.response.responseTime).toBeUndefined();
    });
  });

  test('correctly formats request querystring', () => {
    const req = createMockHapiRequest({
      query: {
        a: 'hello',
        b: 'world',
      },
    });
    const result = getEcsResponseLog(req);
    expect(result.url.query).toMatchInlineSnapshot(`"a=hello&b=world"`);
    expect(result.message).toMatchInlineSnapshot(`"GET /path?a=hello&b=world 200 - 1.2KB"`);
  });

  test('calls getResponsePayloadBytes to calculate payload bytes', () => {
    const response = { source: '...' };
    const req = createMockHapiRequest({ response });
    getEcsResponseLog(req);
    expect(getResponsePayloadBytes).toHaveBeenCalledWith(response);
  });

  test('excludes payload bytes from message if unavailable', () => {
    (getResponsePayloadBytes as jest.Mock).mockReturnValueOnce(undefined);
    const req = createMockHapiRequest();
    const result = getEcsResponseLog(req);
    expect(result.message).toMatchInlineSnapshot(`"GET /path 200"`);
  });

  test('handles Boom errors in the response', () => {
    const req = createMockHapiRequest({
      response: new Boom('oops'),
    });
    const result = getEcsResponseLog(req);
    expect(result.http.response.status_code).toBe(500);
  });

  describe('filters sensitive headers', () => {
    test('excludes Authorization and Cookie headers by default', () => {
      const req = createMockHapiRequest({
        headers: { authorization: 'a', cookie: 'b', ['user-agent']: 'hi' },
      });
      const result = getEcsResponseLog(req);
      expect(result.http.request.headers).toMatchInlineSnapshot(`
        Object {
          "user-agent": "hi",
        }
      `);
    });

    test('is case-insensitive when filtering headers', () => {
      const req = createMockHapiRequest({
        headers: { Authorization: 'a', COOKIE: 'b', ['user-agent']: 'hi' },
      });
      const result = getEcsResponseLog(req);
      expect(result.http.request.headers).toMatchInlineSnapshot(`
        Object {
          "user-agent": "hi",
        }
      `);
    });
  });

  describe('ecs', () => {
    test('specifies correct ECS version', () => {
      const req = createMockHapiRequest();
      const result = getEcsResponseLog(req);
      expect(result.ecs.version).toBe('1.7.0');
    });

    test('provides an ECS-compatible response', () => {
      const req = createMockHapiRequest();
      const result = getEcsResponseLog(req);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "client": Object {
            "ip": undefined,
          },
          "ecs": Object {
            "version": "1.7.0",
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
              "responseTime": undefined,
              "status_code": 200,
            },
          },
          "message": "GET /path 200 - 1.2KB",
          "url": Object {
            "path": "/path",
            "query": "",
          },
          "user_agent": Object {
            "original": "",
          },
        }
      `);
    });
  });
});
