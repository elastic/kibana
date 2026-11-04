/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Method } from 'axios';
import type { ActionContext } from '../../connector_spec';

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

function createEsError(error: unknown): Error {
  const err = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  const esError = readEsErrorBody(err.response?.data);
  if (esError?.reason || esError?.type) {
    return new Error(
      `Elasticsearch error${esError.type ? ` (${esError.type})` : ''}: ${
        esError.reason ?? 'An unknown error occurred'
      }`
    );
  }
  if (err.response?.status === 401) {
    return new Error(
      'Elasticsearch authentication failed. Check your API key or username/password.'
    );
  }
  if (err.response?.status === 403) {
    return new Error(
      'Elasticsearch access denied. The credentials lack the required privileges for this operation.'
    );
  }
  return new Error(
    `Elasticsearch request failed: ${err.response?.statusText ?? err.message ?? 'Unknown error'}`
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
