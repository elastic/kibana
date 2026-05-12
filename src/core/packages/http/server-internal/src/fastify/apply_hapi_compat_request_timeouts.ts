/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';

/**
 * Mirrors Hapi {@link HttpServer} per-route `options.timeout.idleSocket` via
 * `socket.setTimeout` on the raw socket (inactivity), same as Hapi `routes.timeout.socket`.
 *
 * Runs from `preParsing` after find-my-way has populated the matched Kibana route (when any).
 *
 * @internal
 */
export function applyHapiCompatRequestTimeouts(
  req: FastifyRequest,
  reply: FastifyReply,
  matchedKibanaRoute: RouterRoute | undefined,
  defaultSocketTimeoutMs: number
): void {
  const raw = req.raw;
  const socket = raw.socket;

  if (socket && typeof socket.setTimeout === 'function' && defaultSocketTimeoutMs > 0) {
    const idleMs = matchedKibanaRoute?.options?.timeout?.idleSocket ?? defaultSocketTimeoutMs;
    if (idleMs > 0) {
      socket.setTimeout(idleMs);
      const onSocketTimeout = () => {
        socket.destroy();
      };
      socket.once('timeout', onSocketTimeout);
      const clearIdle = () => {
        socket.setTimeout(0);
        socket.removeListener('timeout', onSocketTimeout);
      };
      // Do not tie idle cleanup to `IncomingMessage` 'close': Node can emit it once the
      // request body is fully read, while the route handler is still awaiting — that
      // would clear `socket.setTimeout` and match Hapi's post-body idle semantics.
      reply.raw.once('finish', clearIdle);
    }
  }
}
