/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';
import type {
  AuthenticationHandler,
  ResponseHeaders,
  AuthResultParams,
  AuthResult,
  AuthResultAuthenticated,
  AuthResultNotHandled,
  AuthResultRedirected,
  AuthToolkit,
} from '@kbn/core-http-server';
import { AuthResultType } from '@kbn/core-http-server';
import {
  FastifyResponseAdapter,
  CoreKibanaRequest,
  lifecycleResponseFactory,
  isKibanaResponse,
} from '@kbn/core-http-router-server-internal';

const authResult = {
  authenticated(data: AuthResultParams = {}): AuthResult {
    return {
      type: AuthResultType.authenticated,
      state: data.state,
      requestHeaders: data.requestHeaders,
      responseHeaders: data.responseHeaders,
    };
  },
  notHandled(): AuthResult {
    return {
      type: AuthResultType.notHandled,
    };
  },
  redirected(headers: { location: string } & ResponseHeaders): AuthResult {
    return {
      type: AuthResultType.redirected,
      headers,
    };
  },
  isAuthenticated(result: AuthResult): result is AuthResultAuthenticated {
    return result?.type === AuthResultType.authenticated;
  },
  isNotHandled(result: AuthResult): result is AuthResultNotHandled {
    return result?.type === AuthResultType.notHandled;
  },
  isRedirected(result: AuthResult): result is AuthResultRedirected {
    return result?.type === AuthResultType.redirected;
  },
};

const toolkit: AuthToolkit = {
  authenticated: authResult.authenticated,
  notHandled: authResult.notHandled,
  redirected: authResult.redirected,
};

/** @internal */
export function adoptToFastifyAuthFormat(
  fn: AuthenticationHandler,
  log: Logger,
  onAuth: (request: FastifyRequest, data: AuthResultParams) => void = () => undefined
) {
  return async function verifyLogin(request: FastifyRequest, reply: FastifyReply) {
    const fastifyResponseAdapter = new FastifyResponseAdapter(reply);
    const kibanaRequest = CoreKibanaRequest.from(request, reply, undefined, false);

    try {
      // The fn function does the actual authentication
      const result = await fn(kibanaRequest, lifecycleResponseFactory, toolkit);

      if (isKibanaResponse(result)) {
        fastifyResponseAdapter.handle(result);
        return;
      }

      if (authResult.isAuthenticated(result)) {
        onAuth(request, {
          state: result.state,
          requestHeaders: result.requestHeaders,
          responseHeaders: result.responseHeaders,
        });
        // TODO: Concert to Fastify
        // reply.authenticated({ credentials: result.state || {} });
        return;
      }

      if (authResult.isRedirected(result)) {
        // we cannot redirect a user when resources with optional auth requested
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return;
        }

        fastifyResponseAdapter.handle(
          lifecycleResponseFactory.redirected({
            headers: result.headers,
          })
        );
        return;
      }

      if (authResult.isNotHandled(result)) {
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return;
        }
        fastifyResponseAdapter.handle(lifecycleResponseFactory.unauthorized());
        return;
      }
      throw new Error(
        `Unexpected result from Authenticate. Expected AuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      throw fastifyResponseAdapter.toInternalError();
    }
  };
}
