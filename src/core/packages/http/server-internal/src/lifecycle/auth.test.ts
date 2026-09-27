/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request, ResponseToolkit } from '@hapi/hapi';
import type { AuthenticationHandler, IKibanaResponse } from '@kbn/core-http-server';
import { hapiMocks } from '@kbn/hapi-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { adoptToHapiAuthFormat } from './auth';
import { SELF_CALL_AUTH_CHALLENGE_HEADER, SELF_CALL_HEADER } from '../self_client_observer';

jest.mock('@kbn/core-http-router-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-http-router-server-internal');
  return {
    ...actual,
    // Return the response verbatim instead of serializing it through hapi, so the assertions can
    // look at the headers the lifecycle decided on.
    HapiResponseAdapter: jest.fn().mockImplementation(() => ({
      handle: (response: IKibanaResponse) => response,
    })),
  };
});

const createHapiRequest = ({
  isSelfCall = false,
  optionalAuth = false,
}: { isSelfCall?: boolean; optionalAuth?: boolean } = {}): Request =>
  hapiMocks.createRequest({
    headers: isSelfCall ? { [SELF_CALL_HEADER]: 'true' } : {},
    // `CoreKibanaRequest` maps hapi's auth mode onto `route.options.authRequired`.
    route: { settings: optionalAuth ? { auth: { mode: 'optional' } } : {} },
  } as any);

const invoke = async (
  handler: AuthenticationHandler,
  request: Request
): Promise<IKibanaResponse | 'continue' | 'authenticated'> => {
  const responseToolkit = {
    continue: 'continue',
    authenticated: jest.fn().mockReturnValue('authenticated'),
  } as unknown as ResponseToolkit;

  return (await adoptToHapiAuthFormat(handler, loggingSystemMock.createLogger())(
    request,
    responseToolkit
  )) as IKibanaResponse | 'continue' | 'authenticated';
};

const headersOf = (result: unknown) => (result as IKibanaResponse).options.headers ?? {};

describe('adoptToHapiAuthFormat', () => {
  describe('self-call auth challenge marker', () => {
    it('marks a 401 the handler returned for a self call', async () => {
      const result = await invoke(
        async (request, response) => response.unauthorized({ body: 'nope' }),
        createHapiRequest({ isSelfCall: true })
      );

      expect(headersOf(result)).toEqual(
        expect.objectContaining({ [SELF_CALL_AUTH_CHALLENGE_HEADER]: 'true' })
      );
    });

    it('marks the 401 produced for an unhandled self call', async () => {
      const result = await invoke(
        async (request, response, toolkit) => toolkit.notHandled(),
        createHapiRequest({ isSelfCall: true })
      );

      expect((result as IKibanaResponse).status).toBe(401);
      expect(headersOf(result)).toEqual(
        expect.objectContaining({ [SELF_CALL_AUTH_CHALLENGE_HEADER]: 'true' })
      );
    });

    it('preserves the headers the handler set alongside the marker', async () => {
      const result = await invoke(
        async (request, response) =>
          response.unauthorized({ headers: { 'www-authenticate': 'Bearer' } }),
        createHapiRequest({ isSelfCall: true })
      );

      expect(headersOf(result)).toEqual({
        'www-authenticate': 'Bearer',
        [SELF_CALL_AUTH_CHALLENGE_HEADER]: 'true',
      });
    });

    it('does not mark a 401 on a request that is not a self call', async () => {
      const result = await invoke(
        async (request, response, toolkit) => toolkit.notHandled(),
        createHapiRequest({ isSelfCall: false })
      );

      expect((result as IKibanaResponse).status).toBe(401);
      expect(headersOf(result)).not.toHaveProperty(SELF_CALL_AUTH_CHALLENGE_HEADER);
    });

    it('does not mark a non-401 response the handler returned for a self call', async () => {
      const result = await invoke(
        async (request, response) => response.forbidden({ body: 'nope' }),
        createHapiRequest({ isSelfCall: true })
      );

      expect((result as IKibanaResponse).status).toBe(403);
      expect(headersOf(result)).not.toHaveProperty(SELF_CALL_AUTH_CHALLENGE_HEADER);
    });

    it('still continues unauthenticated on an optional-auth route instead of issuing a marked 401', async () => {
      const result = await invoke(
        async (request, response, toolkit) => toolkit.notHandled(),
        createHapiRequest({ isSelfCall: true, optionalAuth: true })
      );

      expect(result).toBe('continue');
    });
  });

  it('authenticates the request when the handler succeeds', async () => {
    const result = await invoke(
      async (request, response, toolkit) => toolkit.authenticated({ state: { user: 'foo' } }),
      createHapiRequest({ isSelfCall: true })
    );

    expect(result).toBe('authenticated');
  });
});
