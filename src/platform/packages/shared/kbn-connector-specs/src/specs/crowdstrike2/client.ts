/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ActionContext } from '../../connector_spec';
import {
  FALCON_CLOUD_HOSTS,
  MAX_ATTEMPTS,
  MAX_URL_BYTES,
  MAX_RETRY_WAIT_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_JITTER_MAX_MS,
  SERVER_ERROR_STATUSES,
} from './constants';

/** Falcon's response envelope: `{ meta, resources, errors: [{ code, message }] }`. */
export interface FalconBody {
  meta?: {
    pagination?: { offset?: number | string; limit?: number; total?: number; after?: string };
  };
  resources?: unknown;
  errors?: Array<{ code?: number; message?: string; id?: string }> | null;
  [key: string]: unknown;
}

export interface FalconResponse<T = FalconBody> {
  status: number;
  data: T;
  headers: Record<string, unknown>;
}

export interface FalconRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  /** Per-request timeout in milliseconds (default 60 s). */
  timeout?: number;
  responseType?: AxiosRequestConfig['responseType'];
  /** Retry 5xx too: only for reads and calls that are idempotent in effect. 429 is always retried. */
  retryServerErrors: boolean;
  /** Attempts in all, 429 retries included (default MAX_ATTEMPTS); 1 sends the request once. */
  maxAttempts?: number;
  /** API client scope named in a 403 error. */
  scope: string;
  /** Return a 404 to the caller instead of raising it (searches turn it into an empty page). */
  allowNotFound?: boolean;
  /** Use a plain-text error body as the message (Next-Gen SIEM answers errors in text). */
  textErrors?: boolean;
}

/** Wait and clock, overridable in tests so back-off and polling do not spend real time. */
export const timing = {
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

const isLoopbackHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

/** Kibana's distributable sets NODE_ENV=production; development and test runs do not. */
const isProductionBuild = () => process.env.NODE_ENV === 'production';

/**
 * True when a URL is an HTTPS origin without credentials, query or fragment. Plain HTTP is
 * accepted for a loopback host only outside a production build, so a local test server can
 * stand in for Falcon during development.
 */
export const isAllowedFalconUrl = (value: string, path: RegExp): boolean => {
  if (!URL.canParse(value)) {
    return false;
  }
  const url = new URL(value);
  const secure =
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && !isProductionBuild() && isLoopbackHost(url.hostname));
  return (
    secure && !url.username && !url.password && !url.search && !url.hash && path.test(url.pathname)
  );
};

/** Base URL of the configured Falcon cloud, checked against the OAuth token URL's host. */
export const getBaseUrl = (ctx: ActionContext): string => {
  const { region = 'us-1', apiUrl } = (ctx.config ?? {}) as { region?: string; apiUrl?: string };
  let origin: string;
  if (region === 'custom') {
    if (!apiUrl) {
      throw new Error(
        'The Falcon cloud is set to Custom, but no API URL is configured. Enter the API URL in the connector settings.'
      );
    }
    origin = new URL(apiUrl).origin;
  } else {
    const host = FALCON_CLOUD_HOSTS[region as keyof typeof FALCON_CLOUD_HOSTS];
    if (!host) {
      throw new Error(`Unknown Falcon cloud "${region}".`);
    }
    origin = `https://${host}`;
  }
  const tokenUrl = ctx.secrets?.tokenUrl;
  if (typeof tokenUrl === 'string' && URL.canParse(tokenUrl)) {
    const tokenOrigin = new URL(tokenUrl).origin;
    if (tokenOrigin !== origin) {
      throw new Error(
        `The OAuth token URL is on ${new URL(tokenUrl).host}, but the selected Falcon cloud is ${
          new URL(origin).host
        }. Set the token URL to ${origin}/oauth2/token, or select the cloud that matches it.`
      );
    }
  }
  return origin;
};

/** Repeats array values (`ids=a&ids=b`), as Falcon documents, and drops unset values. */
export const serializeParams = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    for (const entry of Array.isArray(value) ? value : [value]) {
      search.append(key, String(entry));
    }
  }
  return search.toString();
};

/** Quotes a value for an FQL filter: single quotes, with backslashes and quotes escaped. */
export const fqlQuote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const header = (headers: Record<string, unknown>, name: string): string | undefined => {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
};

/**
 * How long to wait before retry `attempt` (1-based): until X-RateLimit-RetryAfter (epoch seconds),
 * else Retry-After (seconds), else 1 s, 2 s, 4 s; plus jitter and capped at 30 s.
 */
export const retryDelayMs = (headers: Record<string, unknown>, attempt: number): number => {
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MAX_MS);
  const resetAt = Number(header(headers, 'X-RateLimit-RetryAfter'));
  const untilReset = Number.isFinite(resetAt) ? resetAt * 1000 - timing.now() : NaN;
  if (untilReset > 0) {
    return Math.min(MAX_RETRY_WAIT_MS, untilReset + jitter);
  }
  const retryAfter = Number(header(headers, 'Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(MAX_RETRY_WAIT_MS, retryAfter * 1000 + jitter);
  }
  return Math.min(MAX_RETRY_WAIT_MS, 1000 * 2 ** (attempt - 1) + jitter);
};

/** First Falcon error message in a response body, or `Unknown API error`. */
export const falconMessage = (data: unknown): string => {
  const errors = (data as FalconBody | undefined)?.errors;
  const message = Array.isArray(errors) ? errors.find((e) => e?.message)?.message : undefined;
  return message ?? 'Unknown API error';
};

/** Longest plain-text error body kept in a message. */
const MAX_TEXT_ERROR_CHARS = 1_000;

const errorMessage = (data: unknown, textErrors: boolean | undefined): string => {
  const text = textErrors && typeof data === 'string' ? data.trim() : '';
  return text ? text.slice(0, MAX_TEXT_ERROR_CHARS) : falconMessage(data);
};

const statusError = (
  status: number,
  data: unknown,
  scope: string,
  retries: number,
  textErrors?: boolean
): Error => {
  if (status === 401) {
    return new Error(
      'Status code: 401. Message: authentication failed; check the client ID and secret and that the Falcon cloud matches the tenant'
    );
  }
  if (status === 403) {
    return new Error(
      `Status code: 403. Message: ${errorMessage(
        data,
        textErrors
      )}; the API client needs ${scope} for this action`
    );
  }
  if (status === 429) {
    return new Error(
      `Status code: 429. Message: rate limit reached after ${retries} retries (${errorMessage(
        data,
        textErrors
      )})`
    );
  }
  return new Error(`Status code: ${status}. Message: ${errorMessage(data, textErrors)}`);
};

const networkError = (error: unknown, url: string): Error => {
  const host = new URL(url).host;
  // Kibana caps response bodies (xpack.actions.maxResponseContentLength, 1mb by default); axios then
  // rejects the response with a maxContentLength error, which is not a connection problem.
  if (/maxContentLength/i.test((error as Error)?.message ?? '')) {
    return new Error(
      `The response from ${host} is larger than Kibana allows (xpack.actions.maxResponseContentLength, 1mb by default). Request fewer items with a lower limit or fewer ids, or raise that setting.`
    );
  }
  if (isAxiosError(error)) {
    const cause = error.code === 'ECONNABORTED' ? 'timeout' : error.code ?? 'network error';
    return new Error(`Could not reach ${host}: ${cause} (${error.message})`);
  }
  return new Error(`Could not reach ${host}: ${(error as Error)?.message ?? String(error)}`);
};

/**
 * Requests a new token with the connector's client credentials, for the one repeat after a 401.
 * The framework already cached and sent the first token; this runs only when Falcon rejected it.
 */
const requestFreshToken = async (ctx: ActionContext): Promise<string | undefined> => {
  const { tokenUrl, clientId, clientSecret } = (ctx.secrets ?? {}) as Record<string, unknown>;
  if (
    typeof tokenUrl !== 'string' ||
    typeof clientId !== 'string' ||
    typeof clientSecret !== 'string'
  ) {
    return undefined;
  }
  let response;
  try {
    response = await ctx.client.request<{ access_token?: string }>({
      method: 'POST',
      url: tokenUrl,
      data: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: undefined },
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
    });
  } catch (error) {
    throw networkError(error, tokenUrl);
  }
  const token = response.data?.access_token;
  if (response.status < 200 || response.status >= 300 || typeof token !== 'string') {
    return undefined;
  }
  return `Bearer ${token}`;
};

/**
 * Token obtained after a 401, kept for the rest of the same action run (keyed on its context) so
 * later calls of a multi-call action (RTR or sandbox polls) do not hit 401 and re-authenticate again.
 */
const refreshedTokens = new WeakMap<ActionContext, string>();

/**
 * Sends one Falcon API request. Retries 429 (and 5xx when `retryServerErrors`) up to 3 times,
 * repeats once with a new token after a 401, and turns every other non-2xx into an error that
 * carries the status and Falcon's message. Redirects are never followed.
 */
export const falconRequest = async <T = FalconBody>(
  ctx: ActionContext,
  request: FalconRequest
): Promise<FalconResponse<T>> => {
  const url = `${getBaseUrl(ctx)}${request.path}`;
  const query = request.params ? serializeParams(request.params) : '';
  const urlBytes = new TextEncoder().encode(query ? `${url}?${query}` : url).length;
  if (urlBytes > MAX_URL_BYTES) {
    throw new Error(
      `The request URL would be ${urlBytes} bytes, over the ${MAX_URL_BYTES}-byte limit. Send fewer ids or a shorter comment per call.`
    );
  }
  let authorization: string | undefined = refreshedTokens.get(ctx);
  let refreshed = false;
  let attempt = 1;
  for (;;) {
    let response;
    try {
      response = await ctx.client.request<T>({
        method: request.method,
        url,
        params: request.params,
        paramsSerializer: { serialize: serializeParams },
        data: request.data,
        headers: {
          Accept: 'application/json',
          ...request.headers,
          ...(authorization ? { Authorization: authorization } : {}),
        },
        responseType: request.responseType,
        timeout: request.timeout ?? REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: () => true,
      });
    } catch (error) {
      throw networkError(error, url);
    }
    const { status } = response;
    if (status >= 200 && status < 300) {
      return { status, data: response.data, headers: { ...response.headers } };
    }
    if (status === 401 && !refreshed) {
      refreshed = true;
      authorization = await requestFreshToken(ctx);
      if (authorization) {
        refreshedTokens.set(ctx, authorization);
        continue;
      }
      refreshedTokens.delete(ctx);
    }
    const retryable =
      status === 429 || (request.retryServerErrors && SERVER_ERROR_STATUSES.includes(status));
    if (retryable && attempt < (request.maxAttempts ?? MAX_ATTEMPTS)) {
      const delay = retryDelayMs({ ...response.headers }, attempt);
      ctx.log.debug(
        `CrowdStrike Falcon answered ${status} on ${request.method} ${
          request.path
        }; retry ${attempt} of ${(request.maxAttempts ?? MAX_ATTEMPTS) - 1} in ${delay} ms`
      );
      attempt++;
      await timing.sleep(delay);
      continue;
    }
    if (status === 404 && request.allowNotFound) {
      return { status, data: response.data, headers: { ...response.headers } };
    }
    throw statusError(status, response.data, request.scope, attempt - 1, request.textErrors);
  }
};

/** Resources of a body as an array (Falcon returns `[]` or omits the field when nothing matched). */
export const resourcesOf = <T = unknown>(data: FalconBody | undefined): T[] =>
  Array.isArray(data?.resources) ? (data?.resources as T[]) : [];

export const errorsOf = (data: FalconBody | undefined) => {
  const errors = data?.errors;
  return Array.isArray(errors) ? errors : [];
};

/** True when a Falcon error names the id (in its id field or its message). */
export const names = (failure: { id?: string; message?: string } | undefined, id: string) =>
  failure?.id === id || Boolean(failure?.message?.includes(id));

/** The page total Falcon reported, or the fallback when it is missing or not a finite number. */
export const paginationTotal = (
  data: { meta?: FalconBody['meta'] } | undefined,
  fallback: number
): number => {
  const total = data?.meta?.pagination?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : fallback;
};

/**
 * Position of the next page, or null when the page was the last one or would not advance.
 * Without a total, a full page is taken to mean that more may follow.
 */
export const nextOffset = (
  data: FalconBody | undefined,
  offset: number | undefined,
  limit: number | undefined,
  count: number,
  window = Infinity
): number | null => {
  const start = offset ?? 0;
  const next = start + count;
  const total = paginationTotal(data, NaN);
  if (count === 0 || next <= start || next >= window) {
    return null;
  }
  if (Number.isFinite(total)) {
    return next < total ? next : null;
  }
  return limit !== undefined && count >= limit ? next : null;
};

/** Cursor for the next page of a cursor-paged route, or null. */
export const nextAfter = (data: FalconBody | undefined, count: number): string | null => {
  const after = data?.meta?.pagination?.after;
  return count > 0 && typeof after === 'string' && after.length > 0 ? after : null;
};

/**
 * A lookup by ids: a 404 with no resources means none of the ids exist (an error); a 404 that
 * still carries resources is a partial result.
 */
export const lookupResult = (response: FalconResponse) => {
  const resources = resourcesOf(response.data);
  if (response.status === 404 && resources.length === 0) {
    throw new Error(`Status code: 404. Message: ${falconMessage(response.data)}`);
  }
  return { resources, errors: errorsOf(response.data), meta: response.data?.meta };
};

export interface PageResult {
  resources: unknown[];
  meta?: FalconBody['meta'];
  errors: unknown[];
  next_offset: number | null;
}

/**
 * One page of an offset-paged GET. A 404 means nothing matched and becomes an empty page.
 * `window` stops next_offset where the vendor stops paging (10,000 on alerts).
 */
export const offsetPage = async (
  ctx: ActionContext,
  request: { path: string; params: Record<string, unknown>; scope: string; window?: number }
): Promise<PageResult> => {
  const response = await falconRequest(ctx, {
    method: 'GET',
    path: request.path,
    params: request.params,
    retryServerErrors: true,
    allowNotFound: true,
    scope: request.scope,
  });
  const resources = response.status === 404 ? [] : resourcesOf(response.data);
  const offset = request.params.offset === undefined ? undefined : Number(request.params.offset);
  const limit = request.params.limit === undefined ? undefined : Number(request.params.limit);
  return {
    resources,
    meta: response.data?.meta,
    errors: errorsOf(response.data),
    next_offset: nextOffset(response.data, offset, limit, resources.length, request.window),
  };
};

/**
 * A two-step listing: ids from the queries route (one page), then their details from the
 * entities route. The details call is skipped when the page has no ids.
 */
export const listWithDetails = async (
  ctx: ActionContext,
  request: {
    queryPath: string;
    params: Record<string, unknown>;
    details: (ids: string[]) => Promise<FalconResponse>;
    scope: string;
  }
): Promise<PageResult> => {
  const page = await offsetPage(ctx, {
    path: request.queryPath,
    params: request.params,
    scope: request.scope,
  });
  const ids = page.resources.filter((id): id is string => typeof id === 'string');
  if (ids.length === 0) {
    return { ...page, resources: [] };
  }
  const resources: unknown[] = [];
  const errors: unknown[] = [...page.errors];
  for (const chunk of chunkIdsByUrlBytes(ids)) {
    const details = await request.details(chunk);
    resources.push(...resourcesOf(details.data));
    errors.push(...errorsOf(details.data));
  }
  return { ...page, resources, errors };
};

/** Room left for repeated `ids=` parameters once the base URL and path are counted. */
const ID_QUERY_BUDGET_BYTES = MAX_URL_BYTES - 500;

/** Splits ids into groups whose repeated `ids=` query stays under the URL byte budget. */
export const chunkIdsByUrlBytes = (ids: string[], budget = ID_QUERY_BUDGET_BYTES): string[][] => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let bytes = 0;
  for (const id of ids) {
    const size = serializeParams({ ids: [id] }).length + 1;
    if (current.length > 0 && bytes + size > budget) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(id);
    bytes += size;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
};

/** Details of the given ids from an entities route, in chunks that keep each URL under the limit. */
export const fetchDetails = async (
  ctx: ActionContext,
  path: string,
  ids: string[],
  scope: string
): Promise<{ resources: unknown[]; errors: unknown[] }> => {
  const resources: unknown[] = [];
  const errors: unknown[] = [];
  for (const chunk of chunkIdsByUrlBytes(ids)) {
    const response = await falconRequest(ctx, {
      method: 'GET',
      path,
      params: { ids: chunk },
      retryServerErrors: true,
      allowNotFound: true,
      scope,
    });
    resources.push(...resourcesOf(response.data));
    errors.push(...errorsOf(response.data));
  }
  return { resources, errors };
};
