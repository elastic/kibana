/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyReply } from 'fastify';

/**
 * True when Fastify has already started sending the response. Sending again throws
 * `ERR_HTTP2_HEADERS_SENT` / "Response has already been initiated" on HTTP/2.
 *
 * @internal
 */
export function isReplyCommitted(reply: FastifyReply): boolean {
  return reply.sent === true || reply.raw.headersSent === true;
}
