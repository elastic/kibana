/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequestError } from '../create_connectors/kibana_client';
import type { ExecuteConnectorResult } from '../create_connectors/kibana_client';
import type { Classification } from './types';

const AUTH_STATUS_CODES = new Set([401, 403]);
const TRANSIENT_STATUS_CODES = new Set([408, 429]);
const AUTH_ERROR_NAMES = new Set(['ConnectorAuthorizationError']);
// Fallback for errors that carry no HTTP status, such as MCP-backed connectors. A bare 401/403 only counts right after
// "HTTP(S)" or "status" (optionally "HTTP/1.1", "code", "error", "of", "is"), so an unrelated number is not read as auth.
// The separator is whitespace, ':', '=' or '-' only: '/' would let a URL like "http://403.host" match.
const AUTH_MESSAGE_PATTERN =
  /\b(?:https?|status)(?:\/\d(?:\.\d)?)?[\s:=-]+(?:(?:code|error|of|is)[\s:=-]+)?(?:401|403)\b|unauthori[sz]ed|forbidden|bad credentials|invalid (api )?(key|token)|authentication failed/i;

const getStatusCode = (result: ExecuteConnectorResult): number | undefined => {
  const statusCode = Number(result.error_meta?.statusCode);
  return Number.isInteger(statusCode) && statusCode > 0 ? statusCode : undefined;
};

/** Classifies an execute response with `status: 'error'` by `error_name`, then `error_meta.statusCode`, then (with no status) the message wording. */
export const classifyErrorResult = (result: ExecuteConnectorResult): Classification => {
  const statusCode = getStatusCode(result);
  const detail = result.message ?? 'no message';

  if (result.error_name && AUTH_ERROR_NAMES.has(result.error_name)) {
    return { outcome: 'auth', reason: `${result.error_name}: ${detail}` };
  }
  if (statusCode === undefined) {
    const text = `${result.message ?? ''} ${result.service_message ?? ''}`;
    return AUTH_MESSAGE_PATTERN.test(text)
      ? { outcome: 'auth', reason: `auth error without an HTTP status: ${detail}` }
      : { outcome: 'misc', reason: `no HTTP status on the error: ${detail}` };
  }
  if (AUTH_STATUS_CODES.has(statusCode)) {
    return { outcome: 'auth', reason: `HTTP ${statusCode}: ${detail}` };
  }
  if (TRANSIENT_STATUS_CODES.has(statusCode)) {
    return { outcome: 'misc', reason: `HTTP ${statusCode}: ${detail}` };
  }
  return { outcome: 'error', reason: `HTTP ${statusCode}: ${detail}` };
};

/** Classifies a failure to get an execute response at all: a network error, a dropped connection, a timeout, or Kibana rejecting the request. */
export const classifyThrown = (error: unknown): Classification => {
  const detail = error instanceof Error ? error.message : String(error);
  // Kibana rejected the params outright, so the fixture does not match what the action accepts.
  if (error instanceof KibanaRequestError && error.statusCode === 400) {
    return { outcome: 'fixture', reason: `Kibana rejected the request: ${detail}` };
  }
  return { outcome: 'misc', reason: detail };
};
