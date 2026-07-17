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
  createSelfCallPreResponseHandler,
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
    app: {},
    headers: {
      ...(selfCall ? { 'x-kbn-self-call': 'true' } : {}),
      'elastic-api-version': '2023-10-31',
    },
    method: 'get',
    response: { statusCode: 201 },
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
  it('logs one observe-mode outcome after the authorized request completes', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();

    expect(
      invoke(
        createSelfCallPreAuthHandler(() => false),
        request
      )
    ).toBe(responseToolkit.continue);
    expect(
      invoke(
        createSelfCallPreHandler(() => false),
        request
      )
    ).toBe(responseToolkit.continue);
    expect(log.info).not.toHaveBeenCalled();

    const preResponse = createSelfCallPreResponseHandler(log);
    expect(invoke(preResponse, request)).toBe(responseToolkit.continue);
    expect(log.info).toHaveBeenCalledWith(
      'Kibana self HTTP call targeted a route that has not opted in',
      {
        event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
        http: {
          request: { method: 'GET' },
          response: { status_code: 201 },
        },
        labels: {
          self_http_route_template: '/api/items/{id}',
          self_http_enforcement_mode: 'observe',
          self_http_status_class: '2xx',
          self_http_api_version: '2023-10-31',
        },
      }
    );

    expect(invoke(preResponse, request)).toBe(responseToolkit.continue);
    expect(log.info).toHaveBeenCalledTimes(1);
    const serializedLog = JSON.stringify((log.info as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('raw-id');
    expect(serializedLog).not.toContain('filter=raw-value');
  });

  it('rejects and logs one enforce-mode outcome with a stable 403 response', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();
    const result = invoke(
      createSelfCallPreAuthHandler(() => true),
      request
    ) as {
      output: { statusCode: number; payload: { message: string; attributes: unknown } };
    };

    expect(result.output.statusCode).toBe(403);
    expect(result.output.payload).toEqual(
      expect.objectContaining({
        message: SELF_CALL_NOT_ALLOWED_MESSAGE,
        attributes: { code: SELF_CALL_NOT_ALLOWED_CODE },
      })
    );
    (request as unknown as { response: typeof result }).response = result;
    invoke(createSelfCallPreResponseHandler(log), request);
    expect(log.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
        http: {
          request: { method: 'GET' },
          response: { status_code: 403 },
        },
        labels: expect.objectContaining({
          self_http_enforcement_mode: 'enforce',
          self_http_status_class: '4xx',
        }),
      })
    );
  });

  it('does not mark authentication or authorization failures in observe mode', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();

    invoke(
      createSelfCallPreAuthHandler(() => false),
      request
    );
    invoke(createSelfCallPreResponseHandler(log), request);

    expect(log.info).not.toHaveBeenCalled();
  });

  it.each([
    ['an opted route', createRequest({ selfCallable: true })],
    ['a regular request', createRequest({ selfCall: false })],
  ])('does not log or reject %s', (_description, request) => {
    const log = loggingSystemMock.createLogger();

    expect(
      invoke(
        createSelfCallPreAuthHandler(() => true),
        request
      )
    ).toBe(responseToolkit.continue);
    expect(
      invoke(
        createSelfCallPreHandler(() => false),
        request
      )
    ).toBe(responseToolkit.continue);
    expect(invoke(createSelfCallPreResponseHandler(log), request)).toBe(responseToolkit.continue);
    expect(log.info).not.toHaveBeenCalled();
  });
});
