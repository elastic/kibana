/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import type { ActionContext } from '../../connector_spec';
import {
  ACTION_BUDGET_MS,
  API_PREFIX,
  BACKOFF_MS,
  DEFAULT_API_URL,
  DEPRECATED_ALERT_FIELD,
  MAX_ATTEMPTS,
  READ_RETRY_STATUSES,
  REQUEST_TIMEOUT_MS,
  RETRY_AFTER_CAP_MS,
  VENDOR,
  WRITE_RETRY_STATUSES,
} from './constants';

type HttpMethod = 'GET' | 'POST' | 'PATCH';
export type Params = Record<string, string | number | undefined>;

/** Indirection so tests can skip the real back-off waits. */
export const timers = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Hosts on the same machine (local emulators): the only hosts that may use plain http. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Returns why an API URL cannot be used, or undefined when it is a usable API origin. */
export const apiUrlProblem = (raw: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return `${VENDOR} API URL is not a valid URL: ${raw}`;
  }
  if (parsed.hostname.startsWith('portal.')) {
    const apiUrl = `https://api.${parsed.hostname.slice('portal.'.length)}`;
    return `${VENDOR} API URL looks like the console address (portal...). Use the API address instead, for example ${apiUrl}.`;
  }
  const isLoopbackHttp = parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLoopbackHttp) {
    return `${VENDOR} API URL must use https.`;
  }
  const example = `for example ${parsed.protocol}//${parsed.host}`;
  // A parsed URL can only hold "?" in its query and "#" in its fragment, even an empty one.
  if (raw.includes('?')) {
    return `${VENDOR} API URL must not have a query string (?...). Give only the API address, ${example}.`;
  }
  if (raw.includes('#')) {
    return `${VENDOR} API URL must not have a fragment (#...). Give only the API address, ${example}.`;
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    return `${VENDOR} API URL must not have a path (${parsed.pathname}); the connector adds ${API_PREFIX}. Give only the API address, ${example}.`;
  }
  return undefined;
};

/** Returns the region API origin from the connector config; Kibana's allowed hosts list checks the host. */
export const getApiOrigin = (ctx: ActionContext): string => {
  const raw =
    (typeof ctx.config?.apiUrl === 'string' ? ctx.config.apiUrl.trim() : '') || DEFAULT_API_URL;
  const problem = apiUrlProblem(raw);
  if (problem) {
    throw new Error(problem);
  }
  return new URL(raw).origin;
};

export const getHeader = (
  response: AxiosResponse | undefined,
  name: string
): string | undefined => {
  const headers = (response?.headers ?? {}) as Record<string, unknown>;
  const value = headers[name.toLowerCase()] ?? headers[name];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
};

interface VendorError {
  code?: string;
  message?: string;
}

const truncate = (text: string, max = 1000): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

/** Reads `{ error: { code, message } }`, the product's error envelope. */
export const describeError = (data: unknown): string => {
  if (data === undefined || data === null || data === '') return 'no details';
  if (typeof data === 'string') return truncate(data);
  const error = (data as { error?: VendorError }).error;
  if (error && (error.code || error.message)) {
    return truncate([error.code, error.message].filter(Boolean).join(': '));
  }
  return truncate(JSON.stringify(data));
};

/** Why a request got no HTTP answer: a timeout, a response over the size limit, or the network error. */
const failureReason = (err: AxiosError, timeoutMs: number): string => {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return `timed out after ${Math.round(timeoutMs / 1000)} s`;
  }
  if (/maxContentLength/i.test(err.message ?? '')) {
    return `the response is larger than the Kibana limit (xpack.actions.maxResponseContentLength); ask for fewer items with a smaller top or fewer select fields (${err.message})`;
  }
  return err.message;
};

const statusMessage = (
  action: string,
  status: number,
  detail: string,
  notFound: string | undefined
): string => {
  switch (status) {
    case 400:
      return `${VENDOR} rejected the request (400): ${detail}`;
    case 401:
      return `${VENDOR} ${action} failed (401): ${detail}. Check the API key and that the region matches the tenant`;
    case 403:
      return `${VENDOR} ${action} failed (403): ${detail}. Grant the API key's role the permission listed for this action`;
    case 404:
      return `${notFound ?? 'Resource'} not found (404): ${detail}`;
    case 412:
      return `${VENDOR} ${action} failed (412): the alert changed since it was read; read it again and retry`;
    case 413:
      return `${VENDOR} ${action} failed (413): the submission is too large: ${detail}`;
    case 429:
      return `${VENDOR} rate limit reached for ${action}; try again later (${detail})`;
    default:
      return `${VENDOR} ${action} failed (${status}): ${detail}`;
  }
};

/** Maps an HTTP failure to the connector's error messages, keeping the HTTP status and headers. */
export const toVendorError = (
  action: string,
  error: unknown,
  notFound?: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Error => {
  const err = error as AxiosError;
  if (!err?.isAxiosError && !err?.response) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const status = err.response?.status;
  if (status === undefined) {
    return new Error(`${VENDOR} ${action} request failed: ${failureReason(err, timeoutMs)}`);
  }
  const message = statusMessage(action, status, describeError(err.response?.data), notFound);
  // The executor reads statusCode and headers (Retry-After on a 429) from the thrown error.
  return Object.assign(new Error(message), {
    statusCode: status,
    status,
    headers: { ...(err.response?.headers ?? {}) },
  });
};

const getRetryDelayMs = (error: AxiosError, attempt: number): number => {
  const seconds = Number(getHeader(error.response, 'retry-after'));
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(RETRY_AFTER_CAP_MS, Math.round(seconds * 1000));
  }
  return BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
};

export interface VendorRequest {
  action: string;
  method: HttpMethod;
  /** Path below /v3.0 with every caller value already encoded, or an absolute checked nextLink. */
  path?: string;
  url?: string;
  params?: Params;
  data?: unknown;
  headers?: RawAxiosRequestHeaders;
  mutating: boolean;
  /** Label for a 404, for example "Workbench alert WB-1". */
  notFound?: string;
  /** Returns true when a retryable failure must not be retried (an exhausted sandbox quota). */
  noRetry?: (error: AxiosError) => boolean;
}

const dropEmpty = (params: Params = {}): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
};

const deadlines = new WeakMap<object, number>();

/** Starts the time budget of one action run (ACTION_BUDGET_MS) for this context. */
export const startActionBudget = (ctx: ActionContext): void => {
  deadlines.set(ctx, Date.now() + ACTION_BUDGET_MS);
};

/** Milliseconds left in the action's time budget; unlimited when no budget was started. */
export const budgetLeft = (ctx: ActionContext): number => {
  const deadline = deadlines.get(ctx);
  return deadline === undefined ? Number.POSITIVE_INFINITY : deadline - Date.now();
};

const budgetSpent = (action: string): Error =>
  new Error(
    `${VENDOR} ${action} stopped: the ${
      ACTION_BUDGET_MS / 1000
    } s time budget of one action run is spent`
  );

/**
 * Sends one request with the retry policy: reads retry on 429 and 5xx, state-changing calls only
 * on 429; at most 3 attempts; Retry-After honoured and capped at 30 s. Each request gets the
 * remaining action budget as its timeout (at most 60 s); no request starts and no retry waits
 * once the budget would be passed.
 */
export const vendorRequest = async <T = unknown>(
  ctx: ActionContext,
  req: VendorRequest
): Promise<AxiosResponse<T>> => {
  const url = req.url ?? `${getApiOrigin(ctx)}${API_PREFIX}${req.path ?? ''}`;
  const retryStatuses = req.mutating ? WRITE_RETRY_STATUSES : READ_RETRY_STATUSES;
  for (let attempt = 1; ; attempt++) {
    const left = budgetLeft(ctx);
    if (left <= 0) {
      throw budgetSpent(req.action);
    }
    const timeoutMs = Math.min(REQUEST_TIMEOUT_MS, left);
    try {
      return await ctx.client.request<T>({
        method: req.method,
        url,
        params: req.url ? undefined : dropEmpty(req.params),
        data: req.data,
        headers: req.headers,
        timeout: timeoutMs,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError?.response?.status;
      const retryable =
        status !== undefined &&
        retryStatuses.includes(status) &&
        attempt < MAX_ATTEMPTS &&
        !req.noRetry?.(axiosError);
      if (!retryable) {
        throw toVendorError(req.action, error, req.notFound, timeoutMs);
      }
      const delayMs = getRetryDelayMs(axiosError, attempt);
      if (delayMs >= budgetLeft(ctx)) {
        // The wait would pass the action's budget: report the last answer instead of retrying.
        throw toVendorError(req.action, error, req.notFound, timeoutMs);
      }
      ctx.log.debug(`${VENDOR} ${req.action}: HTTP ${status}, retry ${attempt} in ${delayMs} ms`);
      await timers.sleep(delayMs);
    }
  }
};

/**
 * Checks a caller-supplied nextLink: it must be on the configured region host and on the action's
 * own path, so the API key is never sent anywhere else. Returns the absolute URL to request.
 */
export const checkNextLink = (ctx: ActionContext, nextLink: string, path: string): string => {
  const origin = getApiOrigin(ctx);
  let parsed: URL;
  try {
    parsed = new URL(nextLink, origin);
  } catch {
    throw new Error('nextLink is not a valid URL');
  }
  if (parsed.origin !== origin || parsed.pathname !== `${API_PREFIX}${path}`) {
    throw new Error(
      `nextLink must point to ${origin}${API_PREFIX}${path}; pass the nextLink value returned by this action`
    );
  }
  return parsed.href;
};

/** Quotes a value for TMV1-Filter: single quotes are doubled. */
export const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Joins filter clauses with "and"; values are trimmed and a blank value is dropped, like a missing one.
 * A free-form expression is wrapped in parentheses when combined.
 */
export const buildFilter = (
  clauses: Array<[string, string | undefined]>,
  expression?: string
): string | undefined => {
  const parts = clauses
    .map(([field, value]): [string, string] => [field, value?.trim() ?? ''])
    .filter(([, value]) => value !== '')
    .map(([field, value]) => `${field} eq ${quote(value)}`);
  const free = expression?.trim();
  if (free) parts.push(parts.length > 0 ? `(${free})` : free);
  return parts.length > 0 ? parts.join(' and ') : undefined;
};

export const filterHeader = (filter: string | undefined): RawAxiosRequestHeaders | undefined =>
  filter ? { 'TMV1-Filter': filter } : undefined;

export interface ListPage {
  totalCount?: number;
  count?: number;
  items?: unknown[];
  nextLink?: string;
}

/** Removes the product's deprecated investigationStatus field from an alert. */
export const withoutDeprecated = (item: unknown): unknown => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).filter(
      ([key]) => key !== DEPRECATED_ALERT_FIELD
    )
  );
};

/** The TMV1-Submission-* headers of a sandbox submission. */
export const readQuota = (response: AxiosResponse | undefined) => {
  const num = (name: string): number | null => {
    const value = Number(getHeader(response, name));
    return Number.isFinite(value) && getHeader(response, name) !== undefined ? value : null;
  };
  return {
    reserveCount: num('tmv1-submission-reserve-count'),
    remainingCount: num('tmv1-submission-remaining-count'),
    count: num('tmv1-submission-count'),
    exemptionCount: num('tmv1-submission-exemption-count'),
  };
};
