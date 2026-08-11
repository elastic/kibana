/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchLike } from '@kbn/mcp-client';

/**
 * Actions-owned fetch used by the pooled MCP client type.
 *
 * The Actions plugin implements {@link McpFetchFactory}; MCP client code only depends on
 * these types so `@kbn/connector-specs` does not import the Actions plugin.
 */
export interface McpFetchResource {
  readonly fetch: FetchLike;
  close(): Promise<void>;
}

export interface McpFetchOptions {
  readonly targetUrl: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export type McpFetchFactory = (options: McpFetchOptions) => McpFetchResource;
