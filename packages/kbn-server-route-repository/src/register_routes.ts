/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { errors } from '@elastic/elasticsearch';
import { isBoom } from '@hapi/boom';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import * as t from 'io-ts';
import { merge, pick } from 'lodash';
import { decodeRequestParams } from './decode_request_params';
import { parseEndpoint } from './parse_endpoint';
import { routeValidationObject } from './route_validation_object';
import type { ServerRoute, ServerRouteCreateOptions } from './typings';

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

export function registerRoutes({
  core,
  repository,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, ServerRouteCreateOptions>>;
  logger: Logger;
  dependencies: Record<string, any>;
}) {
  const routes = Object.values(repository);

  const router = core.http.createRouter();

  routes.forEach((route) => {
    const { params, endpoint, options, handler } = route;

    const { method, pathname, version } = parseEndpoint(endpoint);

    const wrappedHandler = async (
      context: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) => {
      try {
        const runtimeType = params || t.strict({});

        const validatedParams = decodeRequestParams(
          pick(request, 'params', 'body', 'query'),
          runtimeType
        );

        const { aborted, data } = await Promise.race([
          handler({
            request,
            context,
            params: validatedParams,
            logger,
            ...dependencies,
          }).then((value) => {
            return {
              aborted: false,
              data: value,
            };
          }),
          request.events.aborted$.toPromise().then(() => {
            return {
              aborted: true,
              data: undefined,
            };
          }),
        ]);

        if (aborted) {
          return response.custom(CLIENT_CLOSED_REQUEST);
        }

        const body = data || {};

        return response.ok({ body });
      } catch (error) {
        logger.error(error);

        const opts = {
          statusCode: 500,
          body: {
            message: error.message,
            attributes: {
              data: {},
            },
          },
        };

        if (error instanceof errors.RequestAbortedError) {
          return response.custom(merge(opts, CLIENT_CLOSED_REQUEST));
        }

        if (isBoom(error)) {
          opts.statusCode = error.output.statusCode;
          opts.body.attributes.data = error?.data;
        }

        return response.custom(opts);
      }
    };

    logger.debug(`Registering endpoint ${endpoint}`);

    if (!version) {
      router[method](
        {
          path: pathname,
          options,
          validate: routeValidationObject,
        },
        wrappedHandler
      );
    } else {
      router.versioned[method]({
        path: pathname,
        access: pathname.startsWith('/internal/') ? 'internal' : 'public',
        options,
      }).addVersion(
        {
          version,
          validate: {
            request: routeValidationObject,
          },
        },
        wrappedHandler
      );
    }
  });
}
