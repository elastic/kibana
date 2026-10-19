/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createMcpClientType,
  isTransientConnectError,
  MCP_CONNECT_MAX_ATTEMPTS,
  MCP_CONNECT_RETRY_DELAY_MS,
} from './client_type';
export type { McpClientTypeDeps, McpConnectRetryOptions } from './client_type';
export { createFetchResource } from './fetch_resource';
export type { CreateFetchResourceOpts, McpFetchResource } from './fetch_resource';
