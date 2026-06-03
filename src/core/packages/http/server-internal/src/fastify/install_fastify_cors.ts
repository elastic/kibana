/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import type { Logger } from '@kbn/logging';
import { KIBANA_HTTP_CORS_ALLOWED_HEADERS } from '@kbn/server-http-tools';
import type { HttpConfig } from '../http_config';

/** Default `routes.cors.maxAge` from `@hapi/hapi`. */
const HAPI_DEFAULT_CORS_MAX_AGE_SECONDS = 86_400;

/**
 * Registers `@fastify/cors` when enabled, mirroring {@link getServerOptions} `routes.cors`.
 *
 * @internal
 */
export async function installFastifyCors(
  fastify: FastifyInstance,
  config: HttpConfig,
  log: Logger
): Promise<void> {
  if (!config.cors.enabled) {
    log.debug('HTTP CORS is disabled');
    return;
  }

  const { allowCredentials, allowOrigin } = config.cors;
  const origin =
    allowOrigin.length === 1 && allowOrigin[0] === '*'
      ? true // Hapi reflects the request Origin when `origin` is `['*']`
      : allowOrigin;

  await fastify.register(cors, {
    origin,
    credentials: allowCredentials,
    allowedHeaders: [...KIBANA_HTTP_CORS_ALLOWED_HEADERS],
    maxAge: HAPI_DEFAULT_CORS_MAX_AGE_SECONDS,
    hideOptionsRoute: true,
  });
}
