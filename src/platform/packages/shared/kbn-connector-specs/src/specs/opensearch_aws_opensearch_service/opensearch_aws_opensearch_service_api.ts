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

function getEndpoint(ctx: ActionContext): string {
  const { endpoint } = (ctx.config ?? {}) as { endpoint?: string };
  if (!endpoint) {
    throw new Error('Connector is missing the required "endpoint" configuration field.');
  }
  return endpoint.replace(/\/+$/, '');
}

function readOpenSearchErrorBody(data: unknown): { type?: string; reason?: string } | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const body = data as Record<string, unknown>;
  const error = body.error;
  if (typeof error === 'string') {
    return { reason: error };
  }
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      type: errorObj.type as string | undefined,
      reason: errorObj.reason as string | undefined,
    };
  }
  return null;
}

function createOpenSearchError(error: unknown): Error {
  const err = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };

  const osError = readOpenSearchErrorBody(err.response?.data);
  if (osError?.reason || osError?.type) {
    return new Error(
      `OpenSearch error${osError.type ? ` (${osError.type})` : ''}: ${
        osError.reason || 'An unknown error occurred'
      }`
    );
  }

  if (err.response?.status === 401) {
    return new Error(
      'OpenSearch authentication failed. Check your AWS access key/secret or username/password.'
    );
  }
  if (err.response?.status === 403) {
    return new Error(
      'OpenSearch access denied. The credentials lack the required IAM permissions or backend role for this operation.'
    );
  }

  return new Error(
    `OpenSearch request failed: ${err.response?.statusText || err.message || 'Unknown error'}`
  );
}

/**
 * Calls the OpenSearch REST API (core, Alerting plugin, or Security Analytics
 * plugin) at the connector's configured endpoint. SigV4 signing (for AWS
 * access key/secret auth) or Basic auth (for self-managed clusters) is
 * applied transparently by the connector's auth configuration.
 */
export async function callOpenSearchApi<T = Record<string, unknown>>(
  ctx: ActionContext,
  method: Method,
  path: string,
  options: { params?: Record<string, unknown>; body?: unknown } = {}
): Promise<T> {
  const url = `${getEndpoint(ctx)}${path}`;
  try {
    const response = await ctx.client.request({
      url,
      method,
      params: options.params,
      data: options.body,
    });
    return response.data as T;
  } catch (error: unknown) {
    throw createOpenSearchError(error);
  }
}

interface GetMonitorResponse {
  _id: string;
  _seq_no: number;
  _primary_term: number;
  monitor: Record<string, unknown>;
}

/** Fetches the current monitor document, used both to read a monitor and as
 * the basis for a partial update (the underlying PUT endpoint fully replaces
 * the monitor, so a partial update must first read the current definition). */
export async function getMonitor(
  ctx: ActionContext,
  monitorId: string
): Promise<GetMonitorResponse> {
  return callOpenSearchApi<GetMonitorResponse>(
    ctx,
    'GET',
    `/_plugins/_alerting/monitors/${encodeURIComponent(monitorId)}`
  );
}

/** Replaces a monitor's full definition, using optimistic-concurrency
 * parameters from a prior getMonitor() call to avoid clobbering a concurrent
 * change made outside this connector. */
export async function putMonitor(
  ctx: ActionContext,
  monitorId: string,
  monitor: Record<string, unknown>,
  concurrency: { seqNo: number; primaryTerm: number }
): Promise<GetMonitorResponse> {
  return callOpenSearchApi<GetMonitorResponse>(
    ctx,
    'PUT',
    `/_plugins/_alerting/monitors/${encodeURIComponent(monitorId)}`,
    {
      params: { if_seq_no: concurrency.seqNo, if_primary_term: concurrency.primaryTerm },
      body: monitor,
    }
  );
}
