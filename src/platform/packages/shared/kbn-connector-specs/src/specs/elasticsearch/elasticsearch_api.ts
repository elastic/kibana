/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Method } from 'axios';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext } from '../../connector_spec';
import { API_KEY_AUTH_REQUIRED_MESSAGE } from '../../auth_types/translations';

// Values that already carry an auth scheme Elasticsearch accepts are kept as is.
const AUTH_SCHEME_PATTERN = /^(ApiKey|Bearer|Basic)\s+\S/i;

/** Builds the Authorization header value, adding the `ApiKey` scheme when the value has none. */
export const toEsApiKeyHeader = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || AUTH_SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return `ApiKey ${trimmed}`;
};

/**
 * Secret schema for the API key field. It runs on save and on every execution, so keys
 * pasted without the prefix work, including keys of connectors saved before this change.
 */
export const esApiKeyHeaderSchema = lazySchema(() =>
  z.string().trim().min(1, { message: API_KEY_AUTH_REQUIRED_MESSAGE }).overwrite(toEsApiKeyHeader)
);

export function getBaseUrl(ctx: ActionContext): string {
  const { url } = (ctx.config ?? {}) as { url?: string };
  if (!url) {
    throw new Error('Connector is missing the required "url" configuration field.');
  }
  return url.replace(/\/+$/, '');
}

function readEsErrorBody(data: unknown): { type?: string; reason?: string } | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;
  const error = body.error;
  if (typeof error === 'string') return { reason: error };
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    return { type: e.type as string | undefined, reason: e.reason as string | undefined };
  }
  return null;
}

export class EsApiError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
  }
}

function createEsError(error: unknown): EsApiError {
  const err = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  const esError = readEsErrorBody(err.response?.data);
  if (esError?.reason || esError?.type) {
    return new EsApiError(
      `Elasticsearch error${esError.type ? ` (${esError.type})` : ''}: ${
        esError.reason ?? 'An unknown error occurred'
      }`,
      err.response?.status
    );
  }
  if (err.response?.status === 401) {
    return new EsApiError(
      'Elasticsearch authentication failed. Check your API key or username/password.',
      err.response.status
    );
  }
  if (err.response?.status === 403) {
    return new EsApiError(
      'Elasticsearch access denied. The credentials lack the required privileges for this operation.',
      err.response.status
    );
  }
  return new EsApiError(
    `Elasticsearch request failed: ${err.response?.statusText ?? err.message ?? 'Unknown error'}`,
    err.response?.status
  );
}

/**
 * Makes an HTTP request to the remote Elasticsearch cluster. Auth headers
 * (Authorization: ApiKey or Authorization: Basic) are applied automatically
 * by the connector's auth type configuration on the axios instance.
 */
export async function callEsApi<T = Record<string, unknown>>(
  ctx: ActionContext,
  method: Method,
  path: string,
  options: {
    params?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${getBaseUrl(ctx)}${path}`;
  try {
    const response = await ctx.client.request({
      url,
      method,
      params: options.params,
      data: options.body,
      headers: options.headers,
    });
    return response.data as T;
  } catch (error: unknown) {
    throw createEsError(error);
  }
}
