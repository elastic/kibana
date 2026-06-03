/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

/**
 * Creates a Fastify application instance for the ongoing Hapi → Fastify migration.
 *
 * @remarks
 * This is a scaffold: {@link createServer} still returns `@hapi/hapi` until `HttpServer`
 * is ported to register routes and lifecycle hooks against Fastify. Example: `@fastify/multipart`
 * is declared at the workspace root for `@kbn/core-http-server-internal`.
 *
 * @internal
 */
export async function createFastifyServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  app.get('/__kbn_fastify_ping', async () => ({ ok: true }));

  return app;
}
