/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
// import { createHandler } from './create_handler';
import type { RequestHandler } from '@kbn/core/server';
import type { AuthzDisabled, RouteConfigOptions } from '@kbn/core/server';
import type { RouteDependencies } from '../types';

export const validate = {
  query: schema.maybe(schema.any()),
  body: schema.maybe(schema.any()),
  params: schema.object({
    path: schema.maybe(schema.string()),
  }),
};

const path = '/api/es_proxy/{path*}';
const security: { authz: AuthzDisabled } = {
  authz: {
    enabled: false,
    reason: 'Relies on es client for authorization',
  },
};
const bodyOptions: RouteConfigOptions<'post'>['body'] = {
  output: 'stream',
  parse: false,
};

const options = {
  body: bodyOptions,
};

const defaultRouteConfig = {
  path,
  options,
  security,
  validate,
};

const handler: (method: string) => RequestHandler<{ path: string }> =
  (method: string) => async (ctx, request, response) => {
    try {
      const resp = await (
        await ctx.core
      ).elasticsearch.client.asCurrentUser.transport.request<{ body?: string; statusCode: number }>(
        {
          method,
          path: request.params.path || '',
          querystring: request.url.searchParams.toString(),
          body: request.body || undefined,
        },
        // todo look into asStream option
        // @ts-expect-error
        { meta: true, headers: request.headers }
      );

      return response.custom({
        statusCode: resp.statusCode,
        body: resp.body,
      });
    } catch (error) {
      // this needs refinement, console might be changing the result
      return response.customError({
        statusCode: error.statusCode || 500,
        body: error.message,
      });
    }
  };

export const registerProxyRoute = (deps: RouteDependencies) => {
  deps.router.post(defaultRouteConfig, handler('POST'));
  deps.router.delete(defaultRouteConfig, handler('DELETE'));
  deps.router.patch(defaultRouteConfig, handler('PATCH'));
  deps.router.put(defaultRouteConfig, handler('PUT'));
  // todo get body working
  deps.router.get(
    {
      path,
      security,
      validate,
    },
    handler('GET')
  );
};
