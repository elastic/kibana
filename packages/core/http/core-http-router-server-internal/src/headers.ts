/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Headers } from '@kbn/core-http-server';
import { pick } from '@kbn/std';
import { IncomingHttpHeaders } from 'http';

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-elastic-app-auth',
  'es-client-authentication',
];
const REDACTED_HEADER_TEXT = '[REDACTED]';
const normalizeHeaderField = (field: string) => (field ?? '').trim().toLowerCase();

/**
 * Given a header name and value, returns the value if the header is not sensitive,
 * otherwise returns a redacted value.
 */
function redactIfSensitiveHeader(
  header: string,
  value?: string | string[]
): undefined | string | string[] {
  return SENSITIVE_HEADERS.includes(normalizeHeaderField(header))
    ? Array.isArray(value)
      ? value.map(() => REDACTED_HEADER_TEXT)
      : REDACTED_HEADER_TEXT
    : value;
}

/**
 * Given an object of headers, returns a cloned object with the sensitive headers redacted.
 */
export function redactSensitiveHeaders(headers?: Headers): Headers {
  // Shallow clone the headers so we don't mutate the original.
  const result = {} as IncomingHttpHeaders;
  if (headers) {
    for (const key of Object.keys(headers)) {
      result[key] = redactIfSensitiveHeader(key, headers[key]);
    }
  }
  return result;
}

export function pickHeaders(headers: Headers, headersToKeep: string[]): Headers {
  // Normalize list of headers we want to allow
  const headersToKeepNormalized = headersToKeep.map(normalizeHeaderField);

  return pick(headers, headersToKeepNormalized);
}
