/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createSelfCallPreAuthHandler,
  createSelfCallPreHandler,
  SELF_CALL_DISCOVERY_EVENT_ACTION,
  SELF_CALL_NOT_ALLOWED_CODE,
  SELF_CALL_NOT_ALLOWED_MESSAGE,
} from './self_client_policy';

const createRequest = ({
  selfCallable = false,
  selfCall = true,
}: {
  selfCallable?: boolean;
  selfCall?: boolean;
} = {}) =>
  ({
    headers: {
      ...(selfCall ? { 'x-kbn-self-call': 'true' } : {}),
      'elastic-api-version': '2023-10-31',
    },
    method: 'get',
    route: {
      path: '/api/items/{id}',
      settings: { app: { selfCallable } },
    },
    url: new URL('http://localhost/api/items/raw-id?filter=raw-value'),
  } as unknown as Request);

const responseToolkit = { continue: Symbol('continue') } as unknown as ResponseToolkit;
const invoke = (handler: Lifecycle.Method, request: Request) =>
  handler.call(null, request, responseToolkit);

describe('self-call receiving policy', () => {
  it('allows observe-mode requests before auth and logs only before the handler', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();

    expect(invoke(createSelfCallPreAuthHandler('observe', log), request)).toBe(
      responseToolkit.continue
    );
    expect(log.info).not.toHaveBeenCalled();

    expect(invoke(createSelfCallPreHandler('observe', log), request)).toBe(
      responseToolkit.continue
    );
    expect(log.info).toHaveBeenCalledWith(
      'Kibana self HTTP call targeted a route that has not opted in',
      {
        event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
        http: { request: { method: 'GET' } },
        labels: {
          self_http_route_template: '/api/items/{id}',
          self_http_enforcement_mode: 'observe',
          self_http_api_version: '2023-10-31',
        },
      }
    );
    expect(JSON.stringify((log.info as jest.Mock).mock.calls)).not.toContain('raw-id');
    expect(JSON.stringify((log.info as jest.Mock).mock.calls)).not.toContain('filter=raw-value');
  });

  it('rejects a non-opted route during pre-auth with a stable 403 response', () => {
    const log = loggingSystemMock.createLogger();
    const result = invoke(createSelfCallPreAuthHandler('enforce', log), createRequest()) as {
      output: { statusCode: number; payload: { message: string; attributes: unknown } };
    };

    expect(result.output.statusCode).toBe(403);
    expect(result.output.payload).toEqual(
      expect.objectContaining({
        message: SELF_CALL_NOT_ALLOWED_MESSAGE,
        attributes: { code: SELF_CALL_NOT_ALLOWED_CODE },
      })
    );
    expect(log.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
        labels: expect.objectContaining({ self_http_enforcement_mode: 'enforce' }),
      })
    );
  });

  it.each([
    ['an opted route', createRequest({ selfCallable: true })],
    ['a regular request', createRequest({ selfCall: false })],
  ])('does not log or reject %s', (_description, request) => {
    const log = loggingSystemMock.createLogger();

    expect(invoke(createSelfCallPreAuthHandler('enforce', log), request)).toBe(
      responseToolkit.continue
    );
    expect(invoke(createSelfCallPreHandler('observe', log), request)).toBe(
      responseToolkit.continue
    );
    expect(log.info).not.toHaveBeenCalled();
  });
});
