/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { isBoom } from '@hapi/boom';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { isKibanaResponse } from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import {
  ServerRoute,
  ServerRouteCreateOptions,
  ZodParamsObject,
  parseEndpoint,
} from '@kbn/server-route-repository-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { isZod } from '@kbn/zod';
import { merge } from 'lodash';
import { Observable, isObservable } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { passThroughValidationObject, noParamsValidationObject } from './validation_objects';
import { validateAndDecodeParams } from './validate_and_decode_params';
import { makeZodValidationObject } from './make_zod_validation_object';

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

export function registerRoutes<TDependencies extends Record<string, any>>({
  core,
  repository,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, ServerRouteCreateOptions>>;
  logger: Logger;
  dependencies: TDependencies;
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
        const validatedParams = validateAndDecodeParams(request, params);

        const { aborted, result } = await Promise.race([
          handler({
            request,
            response,
            context,
            params: validatedParams,
            logger,
            ...dependencies,
          }).then((value) => {
            return {
              aborted: false,
              result: value,
            };
          }),
          request.events.aborted$.toPromise().then(() => {
            return {
              aborted: true,
              result: undefined,
            };
          }),
        ]);

        if (aborted) {
          return response.custom(CLIENT_CLOSED_REQUEST);
        }

        if (isKibanaResponse(result)) {
          return result;
        } else if (isObservable(result)) {
          return response.ok({
            body: observableIntoEventSourceStream(result as Observable<ServerSentEvent>),
          });
        } else {
          const body = result || {};
          return response.ok({ body });
        }
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

    let validationObject;
    if (params === undefined) {
      validationObject = noParamsValidationObject;
    } else if (isZod(params)) {
      validationObject = makeZodValidationObject(params as ZodParamsObject);
    } else {
      validationObject = passThroughValidationObject;
    }

    const { security, ...restOptions } = options ?? {};

    if (!version) {
      router[method](
        {
          path: pathname,
          security,
          options: restOptions,
          validate: validationObject,
        },
        wrappedHandler
      );
    } else {
      router.versioned[method]({
        path: pathname,
        access: pathname.startsWith('/internal/') ? 'internal' : 'public',
        options: restOptions,
        security,
      }).addVersion(
        {
          version,
          validate: {
            request: validationObject,
          },
        },
        wrappedHandler
      );
    }
  });
}
