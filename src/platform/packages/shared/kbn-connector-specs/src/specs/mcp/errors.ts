/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { clientTypes } from '../../lib/clients';

export const classifyMcpError = (err: unknown): 'user' | undefined =>
  clientTypes.mcp.isUserError?.(err) ? 'user' : undefined;

/**
 * Logs an MCP handler failure the same way the legacy connector did.
 * Tool-level failures can omit the error message so tool arguments are not logged.
 */
export const logMcpError = (
  log: Logger,
  err: unknown,
  {
    operation,
    redactToolError = false,
  }: {
    operation: string;
    redactToolError?: boolean;
  }
): void => {
  const isUserError = clientTypes.mcp.isUserError?.(err) ?? false;
  const isConnectionError = clientTypes.mcp.shouldInvalidateOnError?.(err) ?? false;
  const detail = err instanceof Error ? err.message : String(err);
  const redact = redactToolError && !isConnectionError;
  const message =
    redact && !isUserError ? `MCP ${operation} failed` : `MCP ${operation} failed: ${detail}`;

  if (isUserError) {
    log.warn(message);
    return;
  }

  log.error(message);
};
