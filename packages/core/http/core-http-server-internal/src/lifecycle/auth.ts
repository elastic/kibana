/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
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
  HapiResponseAdapter,
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
export function adoptToHapiAuthFormat(
  fn: AuthenticationHandler,
  log: Logger,
  onAuth: (request: Request, data: AuthResultParams) => void = () => undefined
) {
  return async function interceptAuth(
    request: Request,
    responseToolkit: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    const kibanaRequest = CoreKibanaRequest.from(request, undefined, false);

    try {
      const result = await fn(kibanaRequest, lifecycleResponseFactory, toolkit);

      if (isKibanaResponse(result)) {
        return hapiResponseAdapter.handle(result);
      }

      if (authResult.isAuthenticated(result)) {
        onAuth(request, {
          state: result.state,
          requestHeaders: result.requestHeaders,
          responseHeaders: result.responseHeaders,
        });
        return responseToolkit.authenticated({ credentials: result.state || {} });
      }

      if (authResult.isRedirected(result)) {
        // we cannot redirect a user when resources with optional auth requested
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return responseToolkit.continue;
        }

        return hapiResponseAdapter.handle(
          lifecycleResponseFactory.redirected({
            // hapi doesn't accept string[] as a valid header
            headers: result.headers as any,
          })
        );
      }

      if (authResult.isNotHandled(result)) {
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return responseToolkit.continue;
        }
        return hapiResponseAdapter.handle(lifecycleResponseFactory.unauthorized());
      }
      throw new Error(
        `Unexpected result from Authenticate. Expected AuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
