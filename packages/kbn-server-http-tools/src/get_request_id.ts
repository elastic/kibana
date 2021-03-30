/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request } from '@hapi/hapi';
import uuid from 'uuid';

export function getRequestId(
  request: Request,
  { allowFromAnyIp, ipAllowlist }: { allowFromAnyIp: boolean; ipAllowlist: string[] }
): string {
  const remoteAddress = request.raw.req.socket?.remoteAddress;
  return allowFromAnyIp ||
    // socket may be undefined in integration tests that connect via the http listener directly
    (remoteAddress && ipAllowlist.includes(remoteAddress))
    ? request.headers['x-opaque-id'] ?? uuid.v4()
    : uuid.v4();
}
