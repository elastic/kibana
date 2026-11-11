/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';

import type { IConfigService } from '@kbn/config';
import type { KibanaRequest } from '@kbn/core-http-server';

const SECURITY_CONFIG_PATH = ['xpack', 'security'];
const MISSING_CONFIG_SCHEMA_PREFIX = 'No validation schema has been defined';

/**
 * Session cookie name from the security plugin config, including its default.
 * Undefined when that plugin did not register a schema.
 */
export function readSessionCookieName(configService: IConfigService): string | undefined {
  try {
    const { cookieName } = configService.atPathSync<{ cookieName?: string }>(SECURITY_CONFIG_PATH);
    const trimmed = cookieName?.trim();
    return trimmed ? trimmed : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(MISSING_CONFIG_SCHEMA_PREFIX)) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Stable id for the credential a request will present to Elasticsearch.
 * `null` means the request has no usable credential and must not be cached.
 *
 * An `ApiKey` authorization is the id, even when a cookie is also present.
 * Otherwise a session cookie is the id on its own, so a rotated bearer stays
 * in the same entry. Any other authorization header is the id. The header
 * values are not retained.
 */
export function credentialCacheScope(
  request: KibanaRequest,
  sessionCookieName: string | undefined
): string | null {
  const apiKey = apiKeyAuthorization(request.headers.authorization);
  if (apiKey !== undefined) {
    return hashScope('api-key', apiKey);
  }

  const sessionId =
    sessionCookieName === undefined
      ? undefined
      : readSessionCookie(request.headers.cookie, sessionCookieName);
  if (sessionId !== undefined) {
    return hashScope('session', sessionId);
  }

  const authorization = otherAuthorization(request.headers.authorization);
  if (authorization !== undefined) {
    return hashScope('authorization', authorization);
  }

  return null;
}

function hashScope(kind: 'api-key' | 'session' | 'authorization', material: string): string {
  return createHash('sha256').update(kind).update('\0').update(material).digest('hex');
}

function authorizationValues(value: string | string[] | undefined): string[] {
  if (value == null) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function apiKeyAuthorization(value: string | string[] | undefined): string | undefined {
  return authorizationValues(value).find((entry) => /^apikey\s+\S/i.test(entry));
}

function otherAuthorization(value: string | string[] | undefined): string | undefined {
  const values = authorizationValues(value);
  return values.length > 0 ? values.join('\n') : undefined;
}

function readSessionCookie(
  cookie: string | string[] | undefined,
  cookieName: string
): string | undefined {
  const header = Array.isArray(cookie) ? cookie.join('; ') : cookie;
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    if (name !== cookieName) {
      continue;
    }
    const value = part.slice(separator + 1).trim();
    return value.length > 0 ? value : undefined;
  }

  return undefined;
}
