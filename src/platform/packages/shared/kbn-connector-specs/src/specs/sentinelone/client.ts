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
  API_PREFIX,
  BACKOFF_JITTER_MS,
  BACKOFF_MS,
  FILE_TOO_LARGE_MESSAGE,
  MAX_ATTEMPTS,
  MAX_DOWNLOAD_REDIRECTS,
  MAX_RESPONSE_BYTES,
  READ_RETRY_STATUSES,
  REQUEST_TIMEOUT_MS,
  RETRY_AFTER_CAP_MS,
  WRITE_RETRY_STATUSES,
} from './constants';

export type QueryValue = string | number | boolean | ReadonlyArray<string | number> | undefined;
export type QueryParams = Record<string, QueryValue>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface SentinelOneErrorItem {
  code?: number | string;
  title?: string;
  detail?: string;
}

/** The parts of a SentinelOne response body the connector reads; everything else is passed through. */
export interface SentinelOneBody {
  data?: unknown;
  pagination?: { nextCursor?: string | null; totalItems?: number | null };
  errors?: SentinelOneErrorItem[] | null;
  [key: string]: unknown;
}

export interface ListResult {
  data: unknown[];
  pagination: { nextCursor: string | null; totalItems: number | null };
  errors: SentinelOneErrorItem[] | null;
}

export interface DownloadedFile {
  content: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** Indirection so tests can skip the real back-off waits. */
export const timers = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  407: 'Proxy Authentication Required',
  409: 'Conflict',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  417: 'Expectation Failed',
  422: 'Unprocessable Entity',
  423: 'Locked',
  429: 'Too Many Requests',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/** Hosts on the same machine (local emulators): the only hosts that may use plain http. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Returns the console origin from the connector config (the connector adds the API path). */
export const getConsoleOrigin = (ctx: ActionContext): string => {
  const raw = typeof ctx.config?.url === 'string' ? ctx.config.url.trim() : '';
  if (!raw) {
    throw new Error('SentinelOne connector is missing the required tenant URL (config url).');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`SentinelOne tenant URL is not a valid URL: ${raw}`);
  }
  const isLoopbackHttp = parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLoopbackHttp) {
    throw new Error('SentinelOne tenant URL must use https.');
  }
  return parsed.origin;
};

/** Builds `Authorization: ApiToken <token>`; the raw secret header the auth type installs is suppressed. */
export const getAuthHeaders = (ctx: ActionContext): RawAxiosRequestHeaders => {
  const raw = typeof ctx.secrets?.token === 'string' ? ctx.secrets.token.trim() : '';
  if (!raw) {
    throw new Error('SentinelOne connector is missing the API token.');
  }
  const token = raw.replace(/^ApiToken\s+/i, '');
  return { Authorization: `ApiToken ${token}`, token: false };
};

/** Headers for a host other than the console: no credential of any kind. */
const NO_CREDENTIAL_HEADERS: RawAxiosRequestHeaders = { Authorization: false, token: false };

/**
 * Maps a camelCase operator input (createdAtGte, valueContains) to SentinelOne's filter name
 * (createdAt__gte, value__contains). Names that already use `__` pass through unchanged.
 */
export const toVendorParamName = (key: string): string =>
  key.includes('__') ? key : key.replace(/(Gte|Lte|Contains)$/, (op) => `__${op.toLowerCase()}`);

/**
 * SentinelOne list filters take comma-separated values. Undefined values and blank strings are dropped: a workflow
 * template renders an unset variable as '', and SentinelOne treats an empty filter (ip=) as "match nothing".
 */
export const toQuery = (params: QueryParams = {}): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || (typeof value === 'string' && value.trim() === '')) continue;
    const name = toVendorParamName(key);
    if (Array.isArray(value)) {
      if (value.length > 0) out[name] = value.join(',');
    } else {
      out[name] = value as string | number | boolean;
    }
  }
  return out;
};

const decodeBody = (data: unknown): unknown => {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const text = new TextDecoder().decode(data as ArrayBuffer);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return data;
};

const truncate = (text: string, max = 1000): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const describeBody = (data: unknown): string => {
  const body = decodeBody(data);
  if (body === undefined || body === null || body === '') return '';
  if (typeof body === 'string') return truncate(body);
  const errors = (body as SentinelOneBody).errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return truncate(
      errors
        .map((item) => [item.code, item.title, item.detail].filter((part) => part).join(' '))
        .join('; ')
    );
  }
  return truncate(JSON.stringify(body));
};

const isContentLengthError = (error: AxiosError): boolean =>
  /maxContentLength/i.test(error.message ?? '');

/** Maps an HTTP failure to the V1 message shape (`Status code: N. Message: API Error [...] detail`). */
export const toSentinelOneError = (action: string, error: unknown, isDownload = false): Error => {
  const err = error as AxiosError;
  if (!err?.isAxiosError && !err?.response) {
    return error instanceof Error ? error : new Error(String(error));
  }
  if (isContentLengthError(err)) {
    return new Error(
      isDownload
        ? FILE_TOO_LARGE_MESSAGE
        : `SentinelOne ${action} response is larger than the Kibana Actions response size limit (xpack.actions.maxResponseContentLength); narrow the request (for example a smaller limit)`
    );
  }
  const status = err.response?.status;
  if (status === undefined) {
    const reason =
      err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
        ? 'timed out after 60 s'
        : err.message;
    return new Error(`SentinelOne ${action} request failed: ${reason}`);
  }
  const detail = describeBody(err.response?.data);
  if (status === 401) {
    return new Error(
      `Status code: 401. Message: Unauthorized API Error (401) ${detail}. Check the API token and the tenant URL`
    );
  }
  if (status === 429) {
    return new Error(`SentinelOne rate limit reached for ${action}; try again later`);
  }
  const statusText = err.response?.statusText || STATUS_TEXT[status] || 'Error';
  const suffix = status === 403 ? '. Grant the permission listed for this action' : '';
  return new Error(`Status code: ${status}. Message: API Error [${statusText}] ${detail}${suffix}`);
};

const getRetryDelayMs = (error: AxiosError, attempt: number): number => {
  const header = error.response?.headers?.['retry-after'];
  const seconds = typeof header === 'string' || typeof header === 'number' ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(RETRY_AFTER_CAP_MS, Math.round(seconds * 1000));
  }
  const base = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
  return base + Math.floor(Math.random() * BACKOFF_JITTER_MS);
};

/**
 * Runs a request with the connector's retry policy: reads retry on 429/502/503/504, state-changing
 * calls only on 429; at most 3 attempts; Retry-After honoured and capped at 30 s.
 */
export const withRetry = async <T>(
  ctx: ActionContext,
  action: string,
  mutating: boolean,
  send: () => Promise<T>,
  isDownload = false
): Promise<T> => {
  const retryStatuses = mutating ? WRITE_RETRY_STATUSES : READ_RETRY_STATUSES;
  for (let attempt = 1; ; attempt++) {
    try {
      return await send();
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (status === undefined || !retryStatuses.includes(status) || attempt >= MAX_ATTEMPTS) {
        throw toSentinelOneError(action, error, isDownload);
      }
      const delayMs = getRetryDelayMs(error as AxiosError, attempt);
      ctx.log.debug(
        `SentinelOne ${action}: HTTP ${status}, retry ${attempt}/${
          MAX_ATTEMPTS - 1
        } in ${delayMs} ms`
      );
      await timers.sleep(delayMs);
    }
  }
};

export interface SentinelOneRequest {
  action: string;
  method: HttpMethod;
  /** Path below /web/api/v2.1, with every caller value already encoded. */
  path: string;
  params?: QueryParams;
  body?: unknown;
  mutating: boolean;
  /** Request timeout in ms; defaults to REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

/** Sends one SentinelOne API request and returns the response body. */
export const s1Request = async <T = SentinelOneBody>(
  ctx: ActionContext,
  { action, method, path, params, body, mutating, timeoutMs }: SentinelOneRequest
): Promise<T> => {
  const url = `${getConsoleOrigin(ctx)}${API_PREFIX}${path}`;
  const headers = getAuthHeaders(ctx);
  const response = await withRetry(ctx, action, mutating, () =>
    ctx.client.request<T>({
      method,
      url,
      params: toQuery(params),
      ...(body !== undefined ? { data: body } : {}),
      headers,
      timeout: timeoutMs ?? REQUEST_TIMEOUT_MS,
    })
  );
  return (response.data ?? {}) as T;
};

/** Normalises a list response: data[] and pagination.nextCursor/totalItems are always present. */
export const toListResult = (body: SentinelOneBody): ListResult => ({
  data: Array.isArray(body?.data) ? body.data : [],
  pagination: {
    nextCursor: body?.pagination?.nextCursor ?? null,
    totalItems: body?.pagination?.totalItems ?? null,
  },
  errors: Array.isArray(body?.errors) && body.errors.length > 0 ? body.errors : null,
});

/** Drops registrationToken (it enrolls new agents into the tenant) from site and group records. */
export const withoutRegistrationTokens = (items: unknown[]): unknown[] =>
  items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).filter(([key]) => key !== 'registrationToken')
    );
  });

const REDACTED = '[redacted]';

/** Replaces the non-empty value of credential fields (for example a process download token) in list records. */
export const redactFields = (items: unknown[], fields: readonly string[]): unknown[] =>
  items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([key, value]) => [
        key,
        fields.includes(key) && typeof value === 'string' && value !== '' ? REDACTED : value,
      ])
    );
  });

/** Fails a state-changing step when SentinelOne reports per-item errors or affected = 0 in an HTTP 200. */
export const assertApplied = (
  action: string,
  ids: readonly string[],
  body: SentinelOneBody
): SentinelOneBody => {
  const target = ids.length > 20 ? `${ids.slice(0, 20).join(', ')} (+${ids.length - 20})` : ids;
  const targetText = Array.isArray(target) ? target.join(', ') : target;
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new Error(
      `SentinelOne did not apply ${action} to ${targetText}: ${describeBody({
        errors: body.errors,
      })}`
    );
  }
  const data = body?.data as { affected?: unknown } | undefined;
  if (data && data.affected === 0) {
    throw new Error(
      `SentinelOne did not apply ${action} to ${targetText}: SentinelOne reported 0 affected objects`
    );
  }
  return body;
};

const getHeader = (response: AxiosResponse, name: string): string | undefined => {
  const value = response.headers?.[name];
  return typeof value === 'string' ? value : undefined;
};

const fileNameFrom = (response: AxiosResponse, url: URL, fallback: string): string => {
  const disposition = getHeader(response, 'content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (match) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }
  const last = url.pathname.split('/').filter(Boolean).pop();
  return fallback || last || 'download';
};

const toBase64 = (data: unknown): { content: string; sizeBytes: number } => {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data as ArrayBuffer);
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error(FILE_TOO_LARGE_MESSAGE);
  }
  return { content: Buffer.from(bytes).toString('base64'), sizeBytes: bytes.byteLength };
};

/**
 * Downloads a file within the 25 MB cap and returns it base64-encoded. The token goes only to the
 * console origin; redirects are followed by hand so no credential reaches another host. Every hop
 * goes through ctx.client, so the Kibana allowed hosts check applies to it.
 */
export const downloadFile = async (
  ctx: ActionContext,
  { action, link, fallbackName = '' }: { action: string; link: string; fallbackName?: string }
): Promise<DownloadedFile> => {
  const consoleOrigin = getConsoleOrigin(ctx);
  let current = new URL(link, consoleOrigin);
  for (let hop = 0; hop <= MAX_DOWNLOAD_REDIRECTS; hop++) {
    if (current.protocol !== 'https:' && current.protocol !== 'http:') {
      throw new Error(
        `SentinelOne ${action}: unsupported download link protocol ${current.protocol}`
      );
    }
    const target = current;
    const headers = target.origin === consoleOrigin ? getAuthHeaders(ctx) : NO_CREDENTIAL_HEADERS;
    const response = await withRetry(
      ctx,
      action,
      false,
      () =>
        ctx.client.request<ArrayBuffer>({
          method: 'GET',
          url: target.href,
          headers,
          responseType: 'arraybuffer',
          maxRedirects: 0,
          validateStatus: (status: number) => status >= 200 && status < 400,
          timeout: REQUEST_TIMEOUT_MS,
          maxContentLength: MAX_RESPONSE_BYTES,
        }),
      true
    );
    if (response.status >= 300) {
      const location = getHeader(response, 'location');
      if (!location) {
        throw new Error(`SentinelOne ${action}: redirect without a Location header`);
      }
      current = new URL(location, target);
      continue;
    }
    const { content, sizeBytes } = toBase64(response.data);
    return {
      content,
      fileName: fileNameFrom(response, target, fallbackName),
      contentType: getHeader(response, 'content-type') ?? 'application/octet-stream',
      sizeBytes,
    };
  }
  throw new Error(`SentinelOne ${action}: too many redirects while downloading the file`);
};

/** Rejects a state-changing call whose target would be empty (SentinelOne applies an empty filter to everything). */
export const requireIds = (ids: readonly string[] | undefined, message: string): string[] => {
  const cleaned = (ids ?? []).map((id) => id.trim()).filter((id) => id.length > 0);
  if (cleaned.length === 0) {
    throw new Error(message);
  }
  return cleaned;
};

export interface ScopeInput {
  accountIds?: string[];
  siteIds?: string[];
  groupIds?: string[];
  tenant?: boolean;
}

/** Builds the explicit scope filter of a create action; at least one scope is required. */
export const requireScope = (action: string, input: ScopeInput): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (input.accountIds?.length) filter.accountIds = input.accountIds;
  if (input.siteIds?.length) filter.siteIds = input.siteIds;
  if (input.groupIds?.length) filter.groupIds = input.groupIds;
  if (input.tenant === true) filter.tenant = true;
  if (Object.keys(filter).length === 0) {
    throw new Error(
      `${action} needs an explicit scope: accountIds, siteIds, groupIds or tenant = true`
    );
  }
  return filter;
};

/** Removes undefined values so optional inputs are not sent. */
export const compact = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) (out as Record<string, unknown>)[key] = item;
  }
  return out;
};

type FilterValue = string | number | boolean | string[];

/** Merges additionalFilters into the named filters after checking each key against the route's documented names. */
export const withAdditionalFilters = (
  action: string,
  named: QueryParams,
  additional: Record<string, FilterValue> | undefined,
  allowed: ReadonlySet<string>
): QueryParams => {
  if (!additional) return named;
  const unknown = Object.keys(additional).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(
      `${action}: unknown additionalFilters key(s) ${unknown.join(
        ', '
      )}; use a filter documented for this route`
    );
  }
  const namedVendorKeys = new Set(
    Object.keys(named)
      .filter((key) => named[key] !== undefined)
      .map(toVendorParamName)
  );
  const clash = Object.keys(additional).filter((key) => namedVendorKeys.has(key));
  if (clash.length > 0) {
    throw new Error(
      `${action}: ${clash.join(', ')} is set both as an input and in additionalFilters`
    );
  }
  return { ...named, ...additional };
};
