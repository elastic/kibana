/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { isKibanaHttpError, type IKibanaResponse } from '@kbn/core-http-server';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';

/**
 * Maps thrown handler errors to {@link KibanaResponse} the same way {@link wrapErrors} does for
 * Hapi-shaped handlers, so the Fastify backend does not turn Boom 404s into HTTP 500.
 *
 * @internal
 */
export function kibanaResponseFromRouteHandlerError(error: unknown): IKibanaResponse | undefined {
  if (isKibanaHttpError(error)) {
    return new KibanaResponse(error.output.statusCode, error.output.payload, {
      headers: error.output.headers,
    });
  }
  if (Boom.isBoom(error)) {
    return new KibanaResponse(error.output.statusCode, error.output.payload, {
      headers: error.output.headers as { [key: string]: string },
    });
  }
  return undefined;
}
