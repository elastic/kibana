/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import type { Method } from 'axios';
import type { ActionContext } from '../../connector_spec';

/** Every Privilege Cloud REST route sits under this path on the tenant's Privilege Cloud host. */
export const API_BASE_PATH = '/PasswordVault/API';

/** An error from the Privilege Cloud API, with its HTTP status and vendor error code. */
export class IdiraApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = 'IdiraApiError';
  }
}

export const isNotFound = (error: unknown): boolean =>
  error instanceof IdiraApiError && error.status === 404;

/** Hosts the Privilege Cloud URL may reach over plain http: a proxy or test server on this host only. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether a URL is safe to send a credential to: https, or http to a loopback host only.
 * Unparseable values pass here; the URL schemas reject them.
 */
export const isSecureApiUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') {
      return protocol === 'http:' && LOOPBACK_HOSTS.has(hostname);
    }
    return true;
  } catch {
    return true;
  }
};

export const INSECURE_API_URL_MESSAGE =
  'The Privilege Cloud URL must use https (http is accepted only for localhost), because every request carries the access token.';

export const INSECURE_TOKEN_URL_MESSAGE =
  'The token URL must use https (http is accepted only for localhost), because the token request carries the client secret. Enter the https token URL of your identity tenant, and rotate the client secret if it was sent over http.';

/**
 * Whether a URL has no query string or fragment. The connector appends the API path to the
 * Privilege Cloud URL, so a "?" or "#" would move every action path out of the URL path.
 * Unparseable values pass here; the URL schemas reject them.
 */
export const hasNoQueryOrFragment = (url: string): boolean => {
  try {
    const { search, hash } = new URL(url);
    return search === '' && hash === '' && !url.includes('?') && !url.includes('#');
  } catch {
    return true;
  }
};

export const API_URL_QUERY_MESSAGE =
  'The Privilege Cloud URL cannot contain a query string (?) or a fragment (#). Enter only the tenant address, for example https://your-subdomain.privilegecloud.cyberark.cloud.';

/**
 * The configured Privilege Cloud URL without trailing slashes and without a trailing
 * /PasswordVault or /PasswordVault/API, which users often paste from the portal address.
 * Refuses a Privilege Cloud URL that is not https (http only for loopback) or that has a query
 * string or fragment. The token URL is refused when the connector is saved; the check here
 * covers a connector saved before that rule existed.
 */
export const getApiUrl = (ctx: ActionContext): string => {
  const raw = ctx.config?.apiUrl;
  const configured = typeof raw === 'string' ? raw.trim() : '';
  if (!configured) {
    throw new IdiraApiError('The connector is missing the Privilege Cloud URL.');
  }
  if (!isSecureApiUrl(configured)) {
    throw new IdiraApiError(INSECURE_API_URL_MESSAGE);
  }
  if (!hasNoQueryOrFragment(configured)) {
    throw new IdiraApiError(API_URL_QUERY_MESSAGE);
  }
  const tokenUrl = ctx.secrets?.tokenUrl;
  if (typeof tokenUrl === 'string' && !isSecureApiUrl(tokenUrl.trim())) {
    throw new IdiraApiError(INSECURE_TOKEN_URL_MESSAGE);
  }
  return configured.replace(/\/+$/, '').replace(/\/passwordvault(\/api)?$/i, '');
};

/** Attempts per request, the first one included (so at most 3 retries). */
export const MAX_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 1_000;
/** Longest computed back-off before one retry. */
const MAX_BACKOFF_MS = 30_000;
/** Longest Retry-After the connector honours before one retry. */
const MAX_RETRY_AFTER_MS = 60_000;
/** Per-request timeout, for the API call (the token request uses the Kibana default). */
export const REQUEST_TIMEOUT_MS = 30_000;
/**
 * Wall-clock budget for one call, every attempt and wait included. It stays below the 120 s after
 * which Kibana's HTTP server closes an idle request (server.socketTimeout), so the caller always
 * gets the connector's own error instead of a dropped connection.
 */
export const REQUEST_BUDGET_MS = 100_000;
/** A retry starts only when at least this much budget is left for its request after the wait. */
export const MIN_ATTEMPT_MS = 5_000;
/** Gateway errors a read may retry. A write is never retried on them: it may have been processed. */
const RETRYABLE_READ_STATUSES = new Set([502, 503, 504]);

/** Indirection so tests can skip the real waits, fix the jitter and simulate the clock. */
export const retryTiming = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  random: (): number => Math.random(),
  now: (): number => Date.now(),
};

const BUDGET_TEXT = `the connector's ${REQUEST_BUDGET_MS / 1000} s time limit for one call`;

const isTimeoutError = (error: unknown): boolean =>
  isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');

/** Axios stops reading a response at xpack.actions.maxResponseContentLength with this message. */
const isResponseTooLarge = (error: unknown): boolean =>
  error instanceof Error && /maxContentLength size of .* exceeded/i.test(error.message);

const RESPONSE_TOO_LARGE_TEXT =
  'The response is larger than the xpack.actions.maxResponseContentLength setting allows. Request a smaller page with a lower limit (or narrow the search), or raise the setting.';

/** Seconds (or an HTTP date) from a Retry-After header, as milliseconds. */
export const parseRetryAfter = (value: unknown): number | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const seconds = Number(value);
  if (String(value).trim() !== '' && Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(String(value));
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

/**
 * Wait before the retry that follows `attempt`: the Retry-After value when the API sends one
 * (capped at 60 s), otherwise exponential back-off with full jitter (up to 1, 2, 4 s; capped at 30 s).
 */
export const retryDelay = (retryAfterHeader: unknown, attempt: number): number => {
  const retryAfter = parseRetryAfter(retryAfterHeader);
  if (retryAfter !== undefined) {
    return Math.min(retryAfter, MAX_RETRY_AFTER_MS);
  }
  const ceiling = Math.min(INITIAL_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return Math.floor(retryTiming.random() * ceiling);
};

export interface IdiraRequestOptions {
  method: Method;
  /** Path below /PasswordVault/API, starting with "/". Every interpolated value must already be encoded. */
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  /** What the call needs on the safe or vault; named in the error when the API answers 403. */
  permission: string;
  /** What the call acts on, for the 404 message, for example "account 12_3". */
  target: string;
  /** Values that must never appear in an error message (a password the call sends). */
  redact?: Array<string | undefined>;
  /** Extra sentence for a 403 or 404 answer. */
  accessHint?: string;
}

interface IdiraErrorBody {
  ErrorCode?: string;
  ErrorMessage?: string;
  Details?: unknown;
}

const redactSecrets = (text: string, secrets: Array<string | undefined> = []): string =>
  secrets.reduce<string>(
    (acc, secret) => (secret ? acc.split(secret).join('[REDACTED]') : acc),
    text
  );

/**
 * Turns an Axios error into a message that says what failed and what to do. It quotes only the
 * vendor's ErrorCode and ErrorMessage, never the request body, and redacts any secret the call sent.
 */
export const formatIdiraError = (
  error: unknown,
  options: IdiraRequestOptions,
  retried = 0,
  /** A sentence added to the message, for example why no further retry was made. */
  note?: string
): IdiraApiError => {
  const label = `${options.method.toUpperCase()} ${API_BASE_PATH}${options.path}`;
  const suffix = note ? ` ${note}` : '';
  if (isResponseTooLarge(error)) {
    return new IdiraApiError(`Privilege Cloud request ${label} failed. ${RESPONSE_TOO_LARGE_TEXT}`);
  }
  if (!isAxiosError(error) || !error.response) {
    const reason = error instanceof Error ? error.message : String(error);
    return new IdiraApiError(
      redactSecrets(
        `Privilege Cloud request ${label} failed: ${reason}${note ? `.${suffix}` : ''}`,
        options.redact
      )
    );
  }
  const { status, data } = error.response;
  const body = (typeof data === 'object' && data !== null ? data : undefined) as
    | IdiraErrorBody
    | undefined;
  const code = typeof body?.ErrorCode === 'string' ? body.ErrorCode : undefined;
  const vendorMessage = typeof body?.ErrorMessage === 'string' ? body.ErrorMessage : error.message;
  const detail = `HTTP ${status}${code ? ` ${code}` : ''}: ${vendorMessage}`;
  const hint = options.accessHint ? ` ${options.accessHint}` : '';

  let message: string;
  if (status === 400) {
    message = `Privilege Cloud rejected the request ${label} (${detail}).`;
  } else if (status === 401) {
    message = `Authentication failed for ${label} (${detail}). Check the token URL (your identity tenant), the client ID and the client secret. The cached token was discarded, so the next call requests a new one.`;
  } else if (status === 403) {
    message = `Forbidden: ${label} (${detail}). The service user lacks ${options.permission}.${hint}`;
  } else if (status === 404) {
    message = `Not found: ${options.target} (${detail}).${hint}`;
  } else if (status === 409) {
    message = `Already exists: ${options.target} (${detail}).`;
  } else if (status === 429) {
    message = `Rate limited by Privilege Cloud on ${label}; retried ${retried} time${
      retried === 1 ? '' : 's'
    } (${detail}). Wait and try again.`;
  } else {
    message = `Privilege Cloud error ${status} on ${label} (${detail}).`;
  }
  return new IdiraApiError(redactSecrets(`${message}${suffix}`, options.redact), status, code);
};

/**
 * Sends one request to the Privilege Cloud API. A 429 is retried for every method (the vendor
 * rejects it without processing it); 502, 503 and 504 only for a GET. 400, 401, 403, 404 and 409
 * are never retried. The whole call, retries included, stays within REQUEST_BUDGET_MS: each request
 * gets the remaining budget as its timeout (at most 30 s), and a retry whose wait would leave less
 * than MIN_ATTEMPT_MS for its request is not made; the call then fails with the last error and says
 * why. The access token comes from the auth type, which caches it and drops it after a 401, so the
 * next call requests a fresh one.
 */
export const idiraRequest = async <T>(
  ctx: ActionContext,
  options: IdiraRequestOptions
): Promise<{ status: number; data: T }> => {
  const url = `${getApiUrl(ctx)}${API_BASE_PATH}${options.path}`;
  const isRead = options.method.toUpperCase() === 'GET';
  const deadline = retryTiming.now() + REQUEST_BUDGET_MS;
  let timeout = Math.min(REQUEST_TIMEOUT_MS, REQUEST_BUDGET_MS);

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await ctx.client.request<T>({
        method: options.method,
        url,
        params: options.params,
        data: options.data,
        timeout,
        // Never follow a redirect: the API does not send one, and following it would send the
        // request to another host.
        maxRedirects: 0,
      });
      return { status: response.status, data: response.data };
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const status = response?.status;
      const retryable =
        status === 429 || (status !== undefined && isRead && RETRYABLE_READ_STATUSES.has(status));
      if (!response || !retryable || attempt >= MAX_ATTEMPTS) {
        const cutByBudget = timeout < REQUEST_TIMEOUT_MS && isTimeoutError(error);
        throw formatIdiraError(
          error,
          options,
          attempt - 1,
          cutByBudget ? `The request was stopped at ${BUDGET_TEXT}. Try again later.` : undefined
        );
      }
      const delay = retryDelay(response.headers?.['retry-after'], attempt);
      if (deadline - retryTiming.now() - delay < MIN_ATTEMPT_MS) {
        throw formatIdiraError(
          error,
          options,
          attempt - 1,
          `No further retry was made: waiting ${Math.ceil(
            delay / 1000
          )} s before it would pass ${BUDGET_TEXT}.`
        );
      }
      ctx.log.debug(
        `Privilege Cloud ${options.method.toUpperCase()} ${
          options.path
        } answered ${status}; retrying in ${delay} ms (attempt ${attempt + 1} of ${MAX_ATTEMPTS})`
      );
      await retryTiming.sleep(delay);
      timeout = Math.min(REQUEST_TIMEOUT_MS, deadline - retryTiming.now());
      if (timeout < MIN_ATTEMPT_MS) {
        // The wait overran (a slow timer): never start a request with no time left.
        throw formatIdiraError(
          error,
          options,
          attempt - 1,
          `No further retry was made: ${BUDGET_TEXT} was spent.`
        );
      }
    }
  }
};

export interface PageResult<T> {
  /** The items on this page, as the API returned them. */
  value: T[];
  /** `count` as the API returned it: the number of matching items. */
  count?: number;
  /** The API's own nextLink (relative). Not requested by the connector; page with nextOffset. */
  nextLink?: string;
  /** Computed by the connector from nextLink: the offset to pass for the next page. Absent on the last page. */
  nextOffset?: number;
}

/**
 * The offset of the next page. The API returns a relative nextLink such as
 * "api/accounts?offset=50&limit=50"; only its offset is read, so the connector never requests a
 * URL taken from a response. A nextLink without an offset continues after this page.
 */
export const nextOffsetFrom = (
  nextLink: unknown,
  offset: number,
  pageLength: number
): number | undefined => {
  if (typeof nextLink !== 'string' || nextLink.trim() === '') {
    return undefined;
  }
  const query = nextLink.includes('?') ? nextLink.slice(nextLink.indexOf('?') + 1) : '';
  const raw = new URLSearchParams(query).get('offset') ?? new URLSearchParams(query).get('Offset');
  const parsed = raw === null ? NaN : Number(raw);
  if (Number.isInteger(parsed) && parsed > offset) {
    return parsed;
  }
  return pageLength > 0 ? offset + pageLength : undefined;
};

/** Reads one page of an offset/limit collection (accounts, safe members). */
export const idiraPage = async <T>(
  ctx: ActionContext,
  options: IdiraRequestOptions & { offset: number }
): Promise<PageResult<T>> => {
  const { data } = await idiraRequest<{ value?: T[]; count?: number; nextLink?: string }>(
    ctx,
    options
  );
  const value = Array.isArray(data?.value) ? data.value : [];
  const nextLink = typeof data?.nextLink === 'string' ? data.nextLink : undefined;
  const nextOffset = nextOffsetFrom(nextLink, options.offset, value.length);
  return {
    value,
    ...(typeof data?.count === 'number' ? { count: data.count } : {}),
    ...(nextLink ? { nextLink } : {}),
    ...(nextOffset !== undefined ? { nextOffset } : {}),
  };
};

/** "safeName eq X AND platformId eq Y AND <raw filter>", or undefined when there is no condition. */
export const buildAccountsFilter = (conditions: {
  safeName?: string;
  platformId?: string;
  filter?: string;
}): string | undefined => {
  const parts = [
    conditions.safeName ? `safeName eq ${conditions.safeName}` : undefined,
    conditions.platformId ? `platformId eq ${conditions.platformId}` : undefined,
    conditions.filter?.trim() ? conditions.filter.trim() : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};
