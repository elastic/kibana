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
  createSelfCallPreHandler,
  createSelfCallPreResponseHandler,
  SELF_CALL_OBSERVED_EVENT_ACTION,
} from './self_client_observer';

const createRequest = ({ selfCall = true }: { selfCall?: boolean } = {}) =>
  ({
    app: {},
    headers: {
      ...(selfCall ? { 'x-kbn-self-call': 'true' } : {}),
      'elastic-api-version': '2023-10-31',
    },
    method: 'get',
    response: { statusCode: 201 },
    route: { path: '/api/items/{id}' },
    url: new URL('http://localhost/api/items/raw-id?filter=raw-value'),
  } as unknown as Request);

const responseToolkit = { continue: Symbol('continue') } as unknown as ResponseToolkit;
const invoke = (handler: Lifecycle.Method, request: Request) =>
  handler.call(null, request, responseToolkit);

describe('self-call observer', () => {
  it('logs one privacy-safe outcome after the authorized request completes', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();

    expect(invoke(createSelfCallPreHandler(), request)).toBe(responseToolkit.continue);
    expect(log.info).not.toHaveBeenCalled();

    const preResponse = createSelfCallPreResponseHandler(log);
    expect(invoke(preResponse, request)).toBe(responseToolkit.continue);
    expect(log.info).toHaveBeenCalledWith('Kibana self HTTP call completed', {
      event: { action: SELF_CALL_OBSERVED_EVENT_ACTION },
      http: {
        request: { method: 'GET' },
        response: { status_code: 201 },
      },
      labels: {
        self_http_route_template: '/api/items/{id}',
        self_http_status_class: '2xx',
        self_http_api_version: '2023-10-31',
      },
    });

    expect(invoke(preResponse, request)).toBe(responseToolkit.continue);
    expect(log.info).toHaveBeenCalledTimes(1);
    const serializedLog = JSON.stringify((log.info as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('raw-id');
    expect(serializedLog).not.toContain('filter=raw-value');
  });

  it('does not log calls that did not reach the post-auth handler', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest();

    invoke(createSelfCallPreResponseHandler(log), request);

    expect(log.info).not.toHaveBeenCalled();
  });

  it('does not log regular requests', () => {
    const log = loggingSystemMock.createLogger();
    const request = createRequest({ selfCall: false });

    invoke(createSelfCallPreHandler(), request);
    invoke(createSelfCallPreResponseHandler(log), request);

    expect(log.info).not.toHaveBeenCalled();
  });
});
