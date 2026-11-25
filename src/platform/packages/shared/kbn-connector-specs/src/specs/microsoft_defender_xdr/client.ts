/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { GRAPH_HOST } from './types';
import type { Cloud } from './types';

export const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

/** Resolve Graph API base URL from connector config. Falls back to commercial. */
export const graphBase = (cloud: Cloud | undefined): string =>
  `${GRAPH_HOST[cloud ?? 'commercial']}/v1.0`;

export const formatError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{
    error?: { message?: string; code?: string };
    message?: string;
  }>;
  const graphError = err.response?.data?.error;
  const detail = graphError
    ? `${graphError.code ?? 'Error'}: ${graphError.message ?? 'unknown'}`
    : err.response?.data?.message ?? err.message ?? String(error);
  const httpError = new Error(
    `Microsoft Defender XDR ${action} failed (HTTP ${err.response?.status ?? 'unknown'}): ${detail}`
  );
  // Preserve the HTTP status so the connector executor can read it (e.g. 429 Retry-After).
  if (err.response?.status) {
    (httpError as Error & { statusCode?: number }).statusCode = err.response.status;
  }
  return httpError;
};

/** Shared helper that resolves the Graph base URL, makes the request, and wraps errors. */
export const graphRequest = async (
  ctx: ActionContext,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  action: string,
  opts?: { params?: Record<string, string | number>; body?: unknown }
) => {
  const base = graphBase(ctx.config?.cloud as Cloud | undefined);
  const url = `${base}${path}`;
  const reqOpts = { params: opts?.params, headers: JSON_HEADERS };
  try {
    switch (method) {
      case 'get':
        return (await ctx.client.get(url, reqOpts)).data;
      case 'delete':
        return (await ctx.client.delete(url, reqOpts)).data;
      case 'post':
        return (await ctx.client.post(url, opts?.body, reqOpts)).data;
      case 'patch':
        return (await ctx.client.patch(url, opts?.body, reqOpts)).data;
    }
  } catch (error) {
    throw formatError(action, error);
  }
};
