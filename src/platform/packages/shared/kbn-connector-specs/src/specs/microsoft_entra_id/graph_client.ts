/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Request plumbing shared by every Microsoft Entra ID action: the Graph base URL, URL building,
 * bounded retries for throttling and transient errors, error messages, and nextLink checks.
 */

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ActionContext } from '../../connector_spec';
import {
  ACTION_TIME_BUDGET_MS,
  DEFAULT_GRAPH_BASE_URL,
  GRAPH_VERSION,
  MAX_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  RETRY_AFTER_CAP_MS,
  RETRY_BACKOFF_MS,
  RETRY_JITTER_MS,
} from './constants';

export type QueryValue = string | number | boolean | undefined;
export type Query = Record<string, QueryValue>;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** https for every host; http only for a loopback host (a local mock or emulator). */
export const isAllowedGraphBaseUrl = (value: string): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.pathname !== '/' && url.pathname !== '') return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
};

export const GRAPH_BASE_URL_RULE =
  'The Graph base URL must be an https URL with no path, for example https://graph.microsoft.com (http is accepted only for localhost)';

/**
 * A relative Graph path: RFC 3986 path characters minus ':' (so 'http://x' cannot be read as a
 * URL), plus %XX escapes. Leading '//', '..' and '.' segments and a version prefix are refused,
 * also when percent-encoded, and so is an encoded slash or backslash.
 */
export const RAW_PATH_PATTERN = /^\/(?:[A-Za-z0-9\-._~!$&'()*+,;=@/]|%[0-9A-Fa-f]{2})*$/;

const decodeSegment = (segment: string): string | undefined => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
};

export const isAllowedRawPath = (path: string): boolean => {
  if (!RAW_PATH_PATTERN.test(path) || path.includes('//')) return false;
  const segments = path.slice(1).split('/').map(decodeSegment);
  if (segments.some((s) => s === undefined || s === '.' || s === '..' || /[/\\]/.test(s))) {
    return false;
  }
  return !/^(v1\.0|beta)$/i.test(segments[0] ?? '');
};

/**
 * An id that is put into a URL path as one segment: '.', '..', a slash or backslash, and their
 * percent-encoded forms are refused, so the id cannot point the request at another route.
 */
export const isSafePathId = (value: string): boolean =>
  value !== '.' && value !== '..' && !/[/\\]|%(2e|2f|5c)/i.test(value);

export const PATH_ID_RULE = "Must be an id, not a path: '.', '..', '/' and '\\' are refused";

/** The configured Graph origin, for example https://graph.microsoft.com. */
export const getGraphOrigin = (ctx: ActionContext): string => {
  const configured = ctx.config?.graphBaseUrl;
  const raw = (typeof configured === 'string' && configured.trim()) || DEFAULT_GRAPH_BASE_URL;
  const value = raw.replace(/\/+$/, '');
  if (!isAllowedGraphBaseUrl(value)) {
    throw new Error(GRAPH_BASE_URL_RULE);
  }
  return new URL(value).origin;
};

/**
 * Path segment for a user. Graph reads a leading '$' as a system segment, so a
 * userPrincipalName starting with '$' goes in the users('...') key form.
 */
export const userSegment = (userId: string): string =>
  userId.startsWith('$')
    ? `users('${encodeURIComponent(userId.replace(/'/g, "''"))}')`
    : `users/${encodeURIComponent(userId)}`;

/** Builds `<origin>/<version><path>?<query>`. Values are percent-encoded; '$' keys stay literal. */
export const buildGraphUrl = (
  ctx: ActionContext,
  path: string,
  query: Query = {},
  version: string = GRAPH_VERSION
): string => {
  const parts = Object.entries(query)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key).replace(/^%24/, '$')}=${encodeURIComponent(String(value))}`
    );
  const search = parts.length ? `?${parts.join('&')}` : '';
  return `${getGraphOrigin(ctx)}/${version}${path}${search}`;
};

/** OData string literal: single quotes doubled. */
export const odataString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

interface GraphErrorBody {
  error?: { code?: string; message?: string };
}

export const getStatus = (error: unknown): number | undefined =>
  (error as AxiosError | undefined)?.response?.status;

interface DirectoryErrorBody {
  'odata.error'?: { code?: string; message?: string | { value?: string } };
}

/**
 * Some authentication method routes put a directory error, as a JSON string
 * ({"odata.error":{"code":...,"message":{"value":...}}}), in error.message. Returns its code and text.
 */
const parseDirectoryError = (text: string): { code?: string; message?: string } | undefined => {
  if (!text.trimStart().startsWith('{')) return undefined;
  let parsed: DirectoryErrorBody;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  const inner = parsed?.['odata.error'];
  if (!inner || typeof inner !== 'object') return undefined;
  const message = typeof inner.message === 'string' ? inner.message : inner.message?.value;
  return typeof message === 'string' && message ? { code: inner.code, message } : undefined;
};

export const getGraphErrorDetail = (error: unknown): { code?: string; message?: string } => {
  const data = (error as AxiosError<GraphErrorBody> | undefined)?.response?.data;
  const code = data?.error?.code;
  const message = data?.error?.message;
  const directory = typeof message === 'string' ? parseDirectoryError(message) : undefined;
  if (directory) return { code: code ?? directory.code, message: directory.message };
  return { code, message };
};

export const isNotFound = (error: unknown): boolean => getStatus(error) === 404;

/** A Graph error with the status, Graph's code and message, and what to do about it. */
export class GraphRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly graphCode?: string
  ) {
    super(message);
    this.name = 'GraphRequestError';
  }
}

export const toGraphError = (error: unknown, action: string): Error => {
  if (error instanceof GraphRequestError) return error;
  const status = getStatus(error);
  const { code, message } = getGraphErrorDetail(error);
  const detail = message ? `${code ? ` (${code})` : ''}: ${message}` : '';
  const prefix = `${action} failed`;
  switch (status) {
    case undefined: {
      const reason = error instanceof Error ? error.message : String(error);
      return new GraphRequestError(`${prefix}: ${reason}`);
    }
    case 400:
      return new GraphRequestError(
        `${prefix}: Microsoft Graph rejected the request${detail}`,
        status,
        code
      );
    case 401:
      return new GraphRequestError(
        `${prefix}: authentication failed${detail}. Check the client ID, the client secret or certificate, and the tenant ID in the token URL`,
        status,
        code
      );
    case 403:
      return new GraphRequestError(
        `${prefix}: access denied${detail}. Grant the application permission this action needs and admin consent; risky-user actions also need Microsoft Entra ID P2`,
        status,
        code
      );
    case 404:
      return new GraphRequestError(`${prefix}: not found${detail}`, status, code);
    case 409:
      return new GraphRequestError(`${prefix}: conflict${detail}`, status, code);
    case 429:
      return new GraphRequestError(
        `${prefix}: Microsoft Graph rate limit reached; the request may have been retried, try again later${detail}`,
        status,
        code
      );
    case 503:
    case 504:
      return new GraphRequestError(
        `${prefix}: Microsoft Graph is temporarily unavailable (HTTP ${status})${detail}`,
        status,
        code
      );
    default:
      return new GraphRequestError(`${prefix}: HTTP ${status}${detail}`, status, code);
  }
};

// ---------------------------------------------------------------------------
// Requests with bounded retries
// ---------------------------------------------------------------------------

/** Overridable in tests. */
export const retryTiming = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  now: (): number => Date.now(),
};

/** A wall-clock budget shared by every request of one action. */
export interface Deadline {
  at: number;
}

export const createDeadline = (budgetMs: number = ACTION_TIME_BUDGET_MS): Deadline => ({
  at: retryTiming.now() + budgetMs,
});

export const remainingMs = (deadline: Deadline): number => deadline.at - retryTiming.now();

const readRetryAfterMs = (error: unknown): number | undefined => {
  const headers = (error as AxiosError | undefined)?.response?.headers as
    | Record<string, unknown>
    | undefined;
  const raw = headers?.['retry-after'] ?? headers?.['Retry-After'];
  // Number('') and Number(' ') are 0: a blank header is ignored, not read as "retry now".
  const seconds =
    typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '') ? Number(raw) : NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
};

/** Delay before attempt `attempt + 1`: Retry-After (capped), else 2 s, 5 s, 15 s, with jitter. */
export const retryDelayMs = (error: unknown, attempt: number): number => {
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
  const retryAfter = readRetryAfterMs(error);
  if (retryAfter !== undefined) {
    return Math.min(RETRY_AFTER_CAP_MS, retryAfter) + jitter;
  }
  const base = RETRY_BACKOFF_MS[Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1)];
  return base + jitter;
};

export interface GraphRequestOptions {
  /** Retry 503/504 too. Only for calls that are safe to repeat. 429 is always retried. */
  idempotent: boolean;
  deadline?: Deadline;
}

const isRetryable = (status: number | undefined, idempotent: boolean): boolean =>
  status === 429 || (idempotent && (status === 503 || status === 504));

/**
 * Sends one Graph request, retrying 429 (and 503/504 when idempotent) up to MAX_ATTEMPTS,
 * within the action's time budget. Other errors are thrown at once, unchanged.
 */
export const graphRequest = async <T = unknown>(
  ctx: ActionContext,
  config: AxiosRequestConfig,
  options: GraphRequestOptions
): Promise<AxiosResponse<T>> => {
  const deadline = options.deadline ?? createDeadline();
  for (let attempt = 1; ; attempt++) {
    const budget = remainingMs(deadline);
    if (budget <= 0) {
      throw new GraphRequestError('Time limit reached before Microsoft Graph answered; try again');
    }
    try {
      return await ctx.client.request<T>({
        ...config,
        timeout: Math.min(REQUEST_TIMEOUT_MS, budget),
      });
    } catch (error) {
      const status = getStatus(error);
      if (attempt >= MAX_ATTEMPTS || !isRetryable(status, options.idempotent)) {
        throw error;
      }
      const delay = retryDelayMs(error, attempt);
      if (delay >= remainingMs(deadline)) {
        throw error;
      }
      ctx.log.debug(
        `Microsoft Graph answered ${status}; retry ${attempt}/${MAX_ATTEMPTS - 1} in ${delay} ms`
      );
      await retryTiming.sleep(delay);
    }
  }
};

/** graphRequest that throws a GraphRequestError naming the action. */
export const callGraph = async <T = unknown>(
  ctx: ActionContext,
  action: string,
  config: AxiosRequestConfig,
  options: GraphRequestOptions
): Promise<AxiosResponse<T>> => {
  try {
    return await graphRequest<T>(ctx, config, options);
  } catch (error) {
    throw toGraphError(error, action);
  }
};

export interface NotFound {
  notFound: true;
  message?: string;
}

export const isNotFoundResult = (value: unknown): value is NotFound =>
  typeof value === 'object' && value !== null && (value as NotFound).notFound === true;

/** callGraph, except that a 404 is returned as NotFound with Graph's message. */
export const callGraphAllowNotFound = async <T = unknown>(
  ctx: ActionContext,
  action: string,
  config: AxiosRequestConfig,
  options: GraphRequestOptions
): Promise<AxiosResponse<T> | NotFound> => {
  try {
    return await graphRequest<T>(ctx, config, options);
  } catch (error) {
    if (isNotFound(error)) {
      const { message } = getGraphErrorDetail(error);
      return { notFound: true, ...(message ? { message } : {}) };
    }
    throw toGraphError(error, action);
  }
};

/** Drops OData annotations such as @odata.context from a single object. */
export const withoutContext = (data: unknown): Record<string, unknown> => {
  if (typeof data !== 'object' || data === null) return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(([key]) => key !== '@odata.context')
  );
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface GraphPage<T = Record<string, unknown>> {
  value?: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface PageResult<T = Record<string, unknown>> {
  value: T[];
  nextLink?: string;
  count?: number;
}

export const toPageResult = <T>(data: GraphPage<T> | undefined): PageResult<T> => ({
  value: data?.value ?? [],
  ...(data?.['@odata.nextLink'] ? { nextLink: data['@odata.nextLink'] } : {}),
  ...(typeof data?.['@odata.count'] === 'number' ? { count: data['@odata.count'] } : {}),
});

/**
 * Checks a caller-supplied nextLink before it is requested with the connector's token: it must be
 * on the configured Graph origin and on the collection this action lists (`pathPattern` matches the
 * path after the origin, for example /v1.0/users).
 */
export const checkNextLink = (
  ctx: ActionContext,
  nextLink: string,
  pathPattern: RegExp
): string => {
  const origin = getGraphOrigin(ctx);
  let url: URL;
  try {
    url = new URL(nextLink, `${origin}/`);
  } catch {
    throw new GraphRequestError(
      'nextLink is not a valid URL; pass the nextLink of the previous page'
    );
  }
  if (url.origin !== origin) {
    throw new GraphRequestError(
      `nextLink must point at the configured Microsoft Graph host ${origin}; pass the nextLink of the previous page`
    );
  }
  if (!pathPattern.test(url.pathname)) {
    throw new GraphRequestError(
      'nextLink does not belong to this action; pass the nextLink returned by the same action'
    );
  }
  return url.href;
};

/** Advanced query header, used with $search and with advancedQuery. */
export const EVENTUAL_CONSISTENCY = { ConsistencyLevel: 'eventual' };

/**
 * Headers for a checked nextLink: the advanced query header when the link carries $search or
 * $count (the first page was an advanced query), so a link passed alone keeps it.
 */
export const nextLinkHeaders = (url: string): typeof EVENTUAL_CONSISTENCY | undefined => {
  const params = new URL(url).searchParams;
  return params.has('$search') || params.has('$count') ? EVENTUAL_CONSISTENCY : undefined;
};
