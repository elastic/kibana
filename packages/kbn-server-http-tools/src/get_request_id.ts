/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request } from '@hapi/hapi';

/**
 * Return the requestId for this request from its `x-opaque-id` header,
 * depending on the `server.requestId` configuration, or undefined
 * if the value should not be used.
 */
export function getRequestId(
  request: Request,
  { allowFromAnyIp, ipAllowlist }: { allowFromAnyIp: boolean; ipAllowlist: string[] }
): string | undefined {
  const remoteAddress = request.raw.req.socket?.remoteAddress;
  return allowFromAnyIp ||
    // socket may be undefined in integration tests that connect via the http listener directly
    (remoteAddress && ipAllowlist.includes(remoteAddress))
    ? request.headers['x-opaque-id']
    : undefined;
}
