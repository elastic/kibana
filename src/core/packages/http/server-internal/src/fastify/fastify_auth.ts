/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';
import type { AuthenticationHandler, AuthResult, AuthToolkit } from '@kbn/core-http-server';
import { AuthResultType, isKibanaResponse } from '@kbn/core-http-server';
import { CoreKibanaRequest, lifecycleResponseFactory } from '@kbn/core-http-router-server-internal';
import type { RouterRoute, KibanaRouteOptions } from '@kbn/core-http-server';

import type { AuthStateStorage } from '../auth_state_storage';
import type { AuthHeadersStorage } from '../auth_headers_storage';
import type { FastifyResponseAdapter } from './fastify_response_adapter';
import {
  buildHapiCompatRequestFromFastify,
  isHapiRouteAuthDisabled,
} from './fastify_to_hapi_request';
import { isReplyCommitted } from './fastify_reply_utils';

const authToolkit: AuthToolkit = {
  authenticated: (data = {}) => ({
    type: AuthResultType.authenticated,
    state: data.state,
    requestHeaders: data.requestHeaders,
    responseHeaders: data.responseHeaders,
  }),
  notHandled: (): AuthResult => ({ type: AuthResultType.notHandled }),
  redirected: (headers): AuthResult => ({
    type: AuthResultType.redirected,
    headers,
  }),
};

export const KIBANA_HAPI_COMPAT_REQUEST = Symbol('kibanaHapiCompatRequest');

/**
 * Wires the platform {@link AuthenticationHandler} (session/credentials) the same way
 * {@link HttpServer.registerAuth} does for Hapi: runs in `preValidation` (after route lookup
 * and `onPreAuth`, before `onPostAuth` `preHandler` hooks) so post-auth and route handlers see
 * auth state and scoped ES clients correctly.
 *
 * @internal
 */
export function registerFastifyAuthentication(params: {
  fastify: FastifyInstance;
  fn: AuthenticationHandler;
  log: Logger;
  responseAdapter: FastifyResponseAdapter;
  authState: AuthStateStorage;
  authRequestHeaders: AuthHeadersStorage;
  authResponseHeaders: AuthHeadersStorage;
}): void {
  const { fastify, fn, log, responseAdapter, authState, authRequestHeaders, authResponseHeaders } =
    params;

  // Runs after `preParsing` (route lookup + onPreAuth) and before `preHandler` (onPostAuth).
  // Core registers post-auth handlers during `registerCoreHandlers` before plugins call
  // `registerAuth`; using `preValidation` keeps authenticate-before-postAuth ordering intact.
  fastify.addHook('preValidation', async (req: FastifyRequest, reply: FastifyReply) => {
    const app = ((req as any).app = (req as any).app ?? {});
    const matchedRoute = app.matchedRoute as RouterRoute | undefined;
    const matchedOpts = app.matchedKibanaRouteOptions as KibanaRouteOptions | undefined;
    if (!matchedRoute || !matchedOpts) {
      return;
    }

    let compat = app[KIBANA_HAPI_COMPAT_REQUEST] as ReturnType<
      typeof buildHapiCompatRequestFromFastify
    > | null;
    if (!compat) {
      compat = buildHapiCompatRequestFromFastify(req, reply, matchedRoute, matchedOpts, true);
      app[KIBANA_HAPI_COMPAT_REQUEST] = compat;
    }

    // Hapi does not run the `registerAuth` handler when `route.settings.auth === false`.
    if (isHapiRouteAuthDisabled(compat.route.settings.auth)) {
      return;
    }

    const kibanaRequest = CoreKibanaRequest.from(compat, undefined, false);
    const authNotMandatory = kibanaRequest.route.options.authRequired !== true;

    try {
      const result = await fn(kibanaRequest, lifecycleResponseFactory, authToolkit);

      if (isKibanaResponse(result)) {
        // Hapi `auth.mode: 'try'` (optional routes): invalid credentials must not short-circuit the request.
        if (authNotMandatory && result.status >= 400) {
          return;
        }
        await responseAdapter.handle(result, reply);
        return;
      }

      if (result.type === AuthResultType.authenticated) {
        authState.set(kibanaRequest, result.state);
        // buildHapiCompatRequestFromFastify defaults auth.isAuthenticated to false; CoreKibanaRequest
        // reads that flag (not HttpAuth.get). Sync so downstream services (e.g. user profile in
        // renderCoreApp) match Hapi after successful session authentication.
        (compat as { auth?: { isAuthenticated: boolean; credentials?: unknown } }).auth = {
          isAuthenticated: true,
          credentials: result.state,
        };
        if (result.responseHeaders) {
          authResponseHeaders.set(kibanaRequest, result.responseHeaders);
        }
        if (result.requestHeaders) {
          authRequestHeaders.set(kibanaRequest, result.requestHeaders);
          Object.assign(req.headers, result.requestHeaders);
        }
        return;
      }

      if (result.type === AuthResultType.redirected) {
        // Mirrors Hapi: `auth: false` / optional strategies do not force login redirects.
        if (authNotMandatory) {
          return;
        }
        await responseAdapter.handle(
          lifecycleResponseFactory.redirected({
            headers: result.headers as { location: string },
          }),
          reply
        );
        return;
      }

      if (result.type === AuthResultType.notHandled) {
        // Hapi never invokes `registerAuth` when `route.settings.auth === false`; we always call
        // the handler, so treat `notHandled` like "continue anonymously" when auth isn't required.
        if (authNotMandatory) {
          return;
        }
        await responseAdapter.handle(lifecycleResponseFactory.unauthorized(), reply);
        return;
      }

      throw new Error(`Unexpected authentication result: ${JSON.stringify(result)}`);
    } catch (error) {
      log.error(error);
      if (isReplyCommitted(reply)) {
        return;
      }
      await responseAdapter.handle(
        lifecycleResponseFactory.customError({
          statusCode: 500,
          body: 'An internal server error occurred. Check Kibana server logs for details.',
        }),
        reply
      );
    }
  });

  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload) => {
    if (isReplyCommitted(reply)) {
      return payload;
    }
    const app = (req as any).app;
    const compat = app?.[KIBANA_HAPI_COMPAT_REQUEST] as ReturnType<
      typeof buildHapiCompatRequestFromFastify
    > | null;
    if (!compat) {
      return payload;
    }
    const kibanaRequest = CoreKibanaRequest.from(compat, undefined, false);
    const hdrs = authResponseHeaders.get(kibanaRequest);
    if (hdrs) {
      for (const [name, value] of Object.entries(hdrs)) {
        if (value !== undefined) {
          reply.header(name, value as string | string[]);
        }
      }
    }
    return payload;
  });
}
