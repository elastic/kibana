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
  ABOVE_LATIN1,
  API_PREFIX,
  DEFAULT_API_URL,
  DEPRECATED_ALERT_FIELD,
  REQUEST_TIMEOUT_MS,
  VENDOR,
} from './constants';

type HttpMethod = 'GET' | 'POST' | 'PATCH';
export type Params = Record<string, string | number | undefined>;

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
  if (parsed.username || parsed.password) {
    return `${VENDOR} API URL must not contain a user name or password. Give only the API address, for example ${parsed.protocol}//${parsed.host}.`;
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
  // The Kibana action executor reads error.response.status (errorMeta.statusCode) and
  // error.response.headers (Retry-After) from the thrown error. Only the status and a plain copy
  // of the response headers are kept: never the request config, which holds the API key.
  const headers = { ...(err.response?.headers ?? {}) };
  return Object.assign(new Error(message), {
    statusCode: status,
    status,
    headers,
    response: { status, headers },
  });
};

/** Decodes a percent-encoded URL segment; null when it is malformed (never throws). */
export const decodeSegment = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

/**
 * The last non-empty segment of the path of a Location or Operation-Location header value, decoded
 * (the note id of addAlertNote, the task id of a response task).
 * The URL parser drops the query and the fragment (an encoded %23 stays in the segment); null when
 * the value cannot be parsed or the segment is malformed.
 */
export const lastPathSegment = (value: string): string | null => {
  // A dot segment (`.`, `..` or its encoded form) is removed by the URL parser, which would make the
  // previous segment look like the id, so a location that ends in one has no id.
  const lastRaw = value.split(/[?#]/, 1)[0].split('/').filter(Boolean).pop();
  if (lastRaw !== undefined && DOT_SEGMENT.test(lastRaw)) {
    return null;
  }
  let pathname: string;
  try {
    pathname = new URL(value, 'https://placeholder.invalid').pathname;
  } catch {
    return null;
  }
  const segment = pathname.split('/').filter(Boolean).pop();
  return segment === undefined ? null : decodeSegment(segment);
};

/** Added to a failed state-changing request whose outcome is unknown (no answer read, or a 5xx). */
const MAYBE_APPLIED = 'The change may already have been applied; check before repeating it.';

/**
 * The timeout of a request: the wanted one, but never more than the {{kib}} setting the client was built with
 * (`xpack.actions.responseTimeout`), so a deployment that cancels slow requests sooner keeps doing so.
 */
export const effectiveTimeout = (wantedMs: number, configuredMs: number | undefined): number =>
  typeof configuredMs === 'number' && configuredMs > 0
    ? Math.min(wantedMs, configuredMs)
    : wantedMs;

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
  /** Overrides REQUEST_TIMEOUT_MS for this request. */
  timeoutMs?: number;
  /** Label for a 404, for example "Workbench alert WB-1". */
  notFound?: string;
}

const dropEmpty = (params: Params = {}): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
};

/**
 * Sends one request, with no retry: a failure is thrown once with the HTTP status and the response
 * headers (Retry-After included), so the caller decides what to do next.
 */
export const vendorRequest = async <T = unknown>(
  ctx: ActionContext,
  req: VendorRequest
): Promise<AxiosResponse<T>> => {
  const url = req.url ?? `${getApiOrigin(ctx)}${API_PREFIX}${req.path ?? ''}`;
  const timeoutMs = effectiveTimeout(
    req.timeoutMs ?? REQUEST_TIMEOUT_MS,
    ctx.client.defaults?.timeout
  );
  try {
    return await ctx.client.request<T>({
      method: req.method,
      url,
      params: req.url ? undefined : dropEmpty(req.params),
      data: req.data,
      headers: req.headers,
      timeout: timeoutMs,
      // The API does not redirect: a 3xx fails with its status, so no body or key is sent on.
      maxRedirects: 0,
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError?.response?.status;
    const failure = toVendorError(req.action, error, req.notFound, timeoutMs);
    const unknownOutcome =
      req.mutating &&
      (axiosError?.isAxiosError || axiosError?.response) &&
      (status === undefined || status >= 500);
    if (unknownOutcome) failure.message = `${failure.message}. ${MAYBE_APPLIED}`;
    throw failure;
  }
};

/**
 * Checks a caller-supplied nextLink: it must be on the configured region host and on the action's
 * own path, so the API key is never sent anywhere else, and may not ask for a page size above
 * maxTop (when given). Returns the absolute URL to request.
 */
export const checkNextLink = (
  ctx: ActionContext,
  nextLink: string,
  path: string,
  maxTop?: number
): string => {
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
  if (parsed.username || parsed.password) {
    throw new Error('nextLink must not contain a user name or password');
  }
  if (maxTop !== undefined) {
    for (const top of parsed.searchParams.getAll('top')) {
      if (!(Number(top) <= maxTop)) {
        throw new Error(
          `nextLink asks for a page size (top=${top}) above the limit of ${maxTop} of this action; pass the nextLink value returned by this action`
        );
      }
    }
  }
  return parsed.href;
};

/** Absolute link of the first page of a listing, to compare it with a returned nextLink. */
export const pageUrl = (ctx: ActionContext, path: string, params: Params): string => {
  const link = new URL(`${getApiOrigin(ctx)}${API_PREFIX}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') link.searchParams.set(key, String(value));
  }
  return link.href;
};

/** A link in one comparable form (absolute, sorted query, no fragment) to spot a repeated cursor. */
export const normaliseLink = (ctx: ActionContext, link: string): string => {
  try {
    const parsed = new URL(link, getApiOrigin(ctx));
    parsed.hash = '';
    parsed.searchParams.sort();
    return parsed.href;
  } catch {
    return link;
  }
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

export const filterHeader = (filter: string | undefined): RawAxiosRequestHeaders | undefined => {
  // The HTTP client silently removes characters above U+00FF from a header: never send a changed filter.
  if (filter && ABOVE_LATIN1.test(filter)) {
    throw new Error(
      `${VENDOR} filter has characters above U+00FF, which the TMV1-Filter header cannot carry; nothing was sent. Use agentGuid or a filter with those characters left out`
    );
  }
  return filter ? { 'TMV1-Filter': filter } : undefined;
};

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
