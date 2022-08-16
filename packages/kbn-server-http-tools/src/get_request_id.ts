/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyRequest } from 'fastify';
import uuid from 'uuid';

export function getRequestId(
  request: FastifyRequest,
  { allowFromAnyIp, ipAllowlist }: { allowFromAnyIp: boolean; ipAllowlist: string[] }
): string {
  const remoteAddress = request.socket.remoteAddress;
  return allowFromAnyIp ||
    // socket may be undefined in integration tests that connect via the http listener directly
    (remoteAddress && ipAllowlist.includes(remoteAddress))
    ? (request.headers['x-opaque-id'] as string | undefined) ?? uuid.v4() // TODO(fastify): I don't like that I have to use `as`. Can request.headers['x-opaque-id'] really be of type string[]?
    : uuid.v4();
}
