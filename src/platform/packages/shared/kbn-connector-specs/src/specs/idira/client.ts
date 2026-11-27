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
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    /** The vendor ErrorMessage, with any secret the call sent left out. */
    public readonly vendorMessage?: string
  ) {
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

/**
 * Per-request timeout. The configured Actions timeout (xpack.actions.responseTimeout) wins when it
 * is lower; the token request uses the Kibana default.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/** The timeout of one request: REQUEST_TIMEOUT_MS, or the configured Actions timeout when lower. */
export const requestTimeout = (ctx: ActionContext): number => {
  const configured = ctx.client.defaults?.timeout;
  return typeof configured === 'number' && configured > 0
    ? Math.min(REQUEST_TIMEOUT_MS, configured)
    : REQUEST_TIMEOUT_MS;
};

/**
 * Axios error codes that mean the request never reached Privilege Cloud: the host name did not
 * resolve, the connection was refused, the TLS handshake failed, or the URL or an option was invalid.
 */
const NOT_SENT_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_INVALID_URL',
  'ERR_BAD_OPTION',
  'ERR_BAD_OPTION_VALUE',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

/**
 * Whether a failed request never reached Privilege Cloud. An error that is not an Axios error was
 * thrown before the request was sent, for example by the Actions allowedHosts check; an Axios error
 * says so by its code. A timeout or a connection reset after sending is not in this group.
 */
const wasNotSent = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return true;
  }
  const { code } = error;
  return typeof code === 'string' && (NOT_SENT_CODES.has(code) || /^ERR_SSL_/.test(code));
};

const MAY_HAVE_APPLIED_TEXT =
  'Privilege Cloud may have applied the change: check the current state before you run the action again.';

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

/** The Retry-After hint of an answer as a sentence, or an empty string when there is none. */
const waitHint = (headers: unknown): string => {
  const value =
    typeof headers === 'object' && headers !== null
      ? (headers as Record<string, unknown>)['retry-after']
      : undefined;
  const waitMs = parseRetryAfter(value);
  return waitMs === undefined
    ? ''
    : ` Privilege Cloud asks to wait ${Math.ceil(
        waitMs / 1000
      )} s before the next request (Retry-After).`;
};

/** Most requests one call sends when Privilege Cloud keeps answering 429: the first and 3 retries. */
export const MAX_ATTEMPTS = 4;
/**
 * Longest total time one call waits between attempts, a Retry-After included. A wait that would go
 * past it fails the call at once with the rate-limit error, so an action never hangs for minutes.
 */
export const MAX_TOTAL_RETRY_WAIT_MS = 30_000;
/** First backoff without a Retry-After; it doubles on each retry (1 s, 2 s, 4 s). */
export const INITIAL_BACKOFF_MS = 1_000;

/** Indirection so tests can skip the real waits. */
export const retryTiming = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** The wait before retry `attempt` (1-based): the Retry-After when given, else exponential backoff. */
export const retryDelay = (retryAfterHeader: unknown, attempt: number): number =>
  parseRetryAfter(retryAfterHeader) ?? INITIAL_BACKOFF_MS * 2 ** (attempt - 1);

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
  /** What already exists when the API answers 409; defaults to target. */
  conflictTarget?: string;
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

/**
 * A secret shorter than this could match ordinary words of a message, so it is not cut out of the
 * text: a vendor or network message that contains it is left out instead.
 */
const MIN_REDACT_LENGTH = 8;

const redactSecrets = (text: string, secrets: Array<string | undefined> = []): string =>
  secrets.reduce<string>(
    (acc, secret) =>
      secret && secret.length >= MIN_REDACT_LENGTH ? acc.split(secret).join('[REDACTED]') : acc,
    text
  );

/** The text, or a placeholder when it contains a secret too short to cut out. */
const withoutShortSecrets = (text: string, secrets: Array<string | undefined> = []): string =>
  secrets.some((secret) => secret && secret.length < MIN_REDACT_LENGTH && text.includes(secret))
    ? '(message left out because it contains a value the call sent)'
    : text;

/**
 * Turns an Axios error into a message that says what failed and what to do. It quotes only the
 * vendor's ErrorCode and ErrorMessage, never the request body, and redacts any secret the call sent.
 * A Retry-After hint is reported for every method. When a request that changes data was sent and
 * then timed out, lost its connection or got a 5xx answer, the message says the change may have been
 * applied; a request that was never sent does not get that note.
 */
export const formatIdiraError = (
  error: unknown,
  options: IdiraRequestOptions,
  /** Requests sent for this call, retries included; used in the 429 message. */
  attempts = 1
): IdiraApiError => {
  const label = `${options.method.toUpperCase()} ${API_BASE_PATH}${options.path}`;
  const isWrite = options.method.toUpperCase() !== 'GET';
  if (isResponseTooLarge(error)) {
    return new IdiraApiError(`Privilege Cloud request ${label} failed. ${RESPONSE_TOO_LARGE_TEXT}`);
  }
  if (!isAxiosError(error) || !error.response) {
    const reason = withoutShortSecrets(
      error instanceof Error ? error.message : String(error),
      options.redact
    );
    const uncertain = isWrite && !wasNotSent(error);
    return new IdiraApiError(
      redactSecrets(
        `Privilege Cloud request ${label} failed: ${reason}.${
          uncertain ? ` ${MAY_HAVE_APPLIED_TEXT}` : ''
        }`,
        options.redact
      )
    );
  }
  const { status, data, headers } = error.response;
  const body = (typeof data === 'object' && data !== null ? data : undefined) as
    | IdiraErrorBody
    | undefined;
  const code = typeof body?.ErrorCode === 'string' ? body.ErrorCode : undefined;
  const vendorMessage = withoutShortSecrets(
    typeof body?.ErrorMessage === 'string' ? body.ErrorMessage : error.message,
    options.redact
  );
  const detail = `HTTP ${status}${code ? ` ${code}` : ''}: ${vendorMessage}`;
  const hint = options.accessHint ? ` ${options.accessHint}` : '';
  const wait = waitHint(headers);

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
    message = `Already exists: ${options.conflictTarget ?? options.target} (${detail}).`;
  } else if (status === 429) {
    const retried =
      attempts > 1
        ? ` Still rate limited after ${attempts} attempts.`
        : ` The connector did not retry, because the wait is longer than the ${
            MAX_TOTAL_RETRY_WAIT_MS / 1000
          } s it waits per call.`;
    message = `Rate limited by Privilege Cloud on ${label} (${detail}).${retried}${
      wait || ' Wait, then run the action again.'
    }`;
  } else if (status >= 500) {
    message = `Privilege Cloud error ${status} on ${label} (${detail}).${wait}${
      isWrite ? ` ${MAY_HAVE_APPLIED_TEXT}` : ''
    }`;
  } else {
    message = `Privilege Cloud error ${status} on ${label} (${detail}).${wait}`;
  }
  return new IdiraApiError(
    redactSecrets(message, options.redact),
    status,
    code,
    redactSecrets(vendorMessage, options.redact)
  );
};

/**
 * Sends one request to the Privilege Cloud API. Only a 429 is retried, for every method: a
 * rate-limited request was not processed, so resending it cannot apply a change twice. Each retry
 * waits the Retry-After when Privilege Cloud sends one, else 1 s, 2 s, then 4 s; after MAX_ATTEMPTS
 * requests, or when the next wait would pass MAX_TOTAL_RETRY_WAIT_MS in total, the action fails with
 * the vendor's answer and its Retry-After hint. Every other error, 5xx included, is never retried, so
 * a write that may have been applied is never sent twice. Each request times out after
 * requestTimeout(ctx). The access token comes from the auth type, which caches it and drops it after
 * a 401, so the next call requests a fresh one.
 */
export const idiraRequest = async <T>(
  ctx: ActionContext,
  options: IdiraRequestOptions
): Promise<{ status: number; data: T }> => {
  const url = `${getApiUrl(ctx)}${API_BASE_PATH}${options.path}`;
  let waitedMs = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await ctx.client.request<T>({
        method: options.method,
        url,
        params: options.params,
        data: options.data,
        timeout: requestTimeout(ctx),
        // Never follow a redirect: the API does not send one, and following it would send the
        // request to another host.
        maxRedirects: 0,
      });
      return { status: response.status, data: response.data };
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      if (response?.status !== 429 || attempt >= MAX_ATTEMPTS) {
        throw formatIdiraError(error, options, attempt);
      }
      const delay = retryDelay(response.headers?.['retry-after'], attempt);
      if (waitedMs + delay > MAX_TOTAL_RETRY_WAIT_MS) {
        throw formatIdiraError(error, options, attempt);
      }
      waitedMs += delay;
      ctx.log?.debug?.(
        `Privilege Cloud ${options.method.toUpperCase()} ${API_BASE_PATH}${
          options.path
        } answered 429; retrying in ${delay} ms (attempt ${attempt + 1} of ${MAX_ATTEMPTS})`
      );
      await retryTiming.sleep(delay);
    }
  }
};

/**
 * A name or ID for one URL path segment, percent-encoded. Refuses an empty value, a dot segment
 * ("." or ".."), a slash or backslash, and a percent-encoded dot, slash or backslash: the URL
 * parser resolves dot segments, so ".." under /Members would send the request to the safe itself.
 */
export const pathSegment = (value: string): string => {
  if (value === '' || value === '.' || value === '..' || /[\\/]|%(2e|2f|5c)/i.test(value)) {
    throw new IdiraApiError(
      `"${value.slice(
        0,
        100
      )}" cannot be used as a name or ID in a request URL: it is empty, "." or "..", or contains a slash, a backslash or an encoded dot or slash.`
    );
  }
  return encodeURIComponent(value);
};

/** Whether a response body is the API's list shape: an object with a `field` array (default value). */
export const isListBody = (data: unknown, field = 'value'): boolean =>
  typeof data === 'object' &&
  data !== null &&
  Array.isArray((data as Record<string, unknown>)[field]);

/** Whether a response body is empty: no body, null, or only whitespace. */
export const isEmptyBody = (data: unknown): boolean =>
  data === undefined || data === null || (typeof data === 'string' && data.trim() === '');

/**
 * The article for a field name, by its sound: "an" before a vowel sound (an id, an Activities
 * list), "a" before a consonant sound, including a "u" or "eu" read as "you" (a Users list).
 */
export const articleFor = (word: string): 'a' | 'an' =>
  /^[aeiou]/i.test(word) && !/^(us|uni|eu)/i.test(word) ? 'an' : 'a';

/**
 * What a response body that is not the expected JSON list contains, quoting the upstream text: the
 * vendor's error, an HTML page title, or the start of a text body.
 */
export const describeUnexpectedBody = (data: unknown, field = 'value', noun = 'list'): string => {
  if (isEmptyBody(data)) {
    return 'an empty body';
  }
  if (typeof data === 'string') {
    const text = data.trim();
    if (text.startsWith('<')) {
      const title = /<title[^>]*>([^<]*)<\/title>/i.exec(text)?.[1]?.trim();
      return title ? `an HTML page titled "${title.slice(0, 100)}"` : 'an HTML page';
    }
    return `the text "${text.slice(0, 100)}"`;
  }
  const body = typeof data === 'object' ? (data as IdiraErrorBody) : undefined;
  if (typeof body?.ErrorMessage === 'string') {
    return `the error ${typeof body.ErrorCode === 'string' ? `${body.ErrorCode}: ` : ''}${
      body.ErrorMessage
    }`;
  }
  return `a JSON body without ${articleFor(field)} ${field}${noun ? ` ${noun}` : ''}`;
};

/**
 * The error for an answer whose body is not the list an action reads (an HTML sign-in page, an
 * empty body, an object without the list field), so it is never reported as an empty result.
 */
export const unexpectedListBodyError = (
  options: Pick<IdiraRequestOptions, 'method' | 'path' | 'target'>,
  status: number,
  data: unknown,
  field = 'value'
): IdiraApiError =>
  new IdiraApiError(
    `Privilege Cloud answered ${options.method} ${API_BASE_PATH}${
      options.path
    } with HTTP ${status} and ${describeUnexpectedBody(
      data,
      field
    )} instead of the ${field} list (${
      options.target
    }). Check the Privilege Cloud URL: enter the tenant's Privilege Cloud address, not the portal or identity tenant address.`
  );

/** Whether a response body is a record: a JSON object with a non-empty `field` (default id). */
export const isRecordBody = (data: unknown, field = 'id'): data is Record<string, unknown> => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const value = (data as Record<string, unknown>)[field];
  return (typeof value === 'string' && value !== '') || typeof value === 'number';
};

/**
 * The error for an answer whose body is not the record an action returns (an HTML page, a text, an
 * empty body, an object without the record's ID), so it is never reported as a success.
 */
export const unexpectedRecordBodyError = (
  options: Pick<IdiraRequestOptions, 'method' | 'path' | 'target'>,
  status: number,
  data: unknown,
  record: string,
  field = 'id'
): IdiraApiError =>
  new IdiraApiError(
    `Privilege Cloud answered ${options.method} ${API_BASE_PATH}${
      options.path
    } with HTTP ${status} and ${describeUnexpectedBody(data, field, '')} instead of ${record} (${
      options.target
    }). Check the Privilege Cloud URL: enter the tenant's Privilege Cloud address, not the portal or identity tenant address.`
  );

/** Sends one request whose answer must be a record with an `id`, such as an account or a vault user. */
export const idiraRecord = async (
  ctx: ActionContext,
  options: IdiraRequestOptions,
  record: string
): Promise<Record<string, unknown>> => {
  const { status, data } = await idiraRequest<unknown>(ctx, options);
  if (!isRecordBody(data)) {
    throw unexpectedRecordBodyError(options, status, data, record);
  }
  return data;
};

/**
 * Sends one write request whose answer is an empty body or JSON (the record or value the API
 * documents). A text or HTML body on a 2xx answer, such as a sign-in or proxy page, is an error,
 * never a success. The quoted body is redacted like an error message.
 */
export const idiraWrite = async (
  ctx: ActionContext,
  options: IdiraRequestOptions
): Promise<{ status: number; data: unknown }> => {
  const answer = await idiraRequest<unknown>(ctx, options);
  if (typeof answer.data === 'string' && !isEmptyBody(answer.data)) {
    const body = withoutShortSecrets(answer.data, options.redact);
    const { message } = unexpectedRecordBodyError(
      options,
      answer.status,
      body,
      'an empty or JSON answer'
    );
    throw new IdiraApiError(redactSecrets(message, options.redact));
  }
  return answer;
};

export interface PageResult<T> {
  /** The items on this page, as the API returned them. */
  value: T[];
  /** `count` as the API returned it: the number of matching items. */
  count?: number;
  /**
   * Computed by the connector from the API's nextLink: the offset to pass for the next page. Absent
   * on the last page. The nextLink itself is not returned: it repeats this offset as a vendor URL.
   */
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
  const { status, data } = await idiraRequest<{ value?: T[]; count?: number; nextLink?: string }>(
    ctx,
    options
  );
  if (!isListBody(data)) {
    throw unexpectedListBodyError(options, status, data);
  }
  const value = data.value ?? [];
  const nextOffset = nextOffsetFrom(data.nextLink, options.offset, value.length);
  return {
    value,
    ...(typeof data.count === 'number' ? { count: data.count } : {}),
    ...(nextOffset !== undefined ? { nextOffset } : {}),
  };
};

/**
 * The offset of the next page of a collection that reports only a Total, no nextLink (such as
 * LiveSessions): the next page starts after this one while fewer than Total items have been read.
 * Without a Total, a full page means another may follow. An empty page always ends the paging.
 */
export const nextOffsetFromTotal = (
  total: unknown,
  offset: number,
  pageLength: number,
  limit: number
): number | undefined => {
  if (pageLength === 0) {
    return undefined;
  }
  const next = offset + pageLength;
  if (typeof total === 'number' && Number.isFinite(total)) {
    return next < total ? next : undefined;
  }
  return pageLength >= limit ? next : undefined;
};

/**
 * Reads one page of an offset/limit collection whose items are in `field` and whose size is in
 * Total, with no nextLink (LiveSessions). Returns the same shape as idiraPage.
 */
export const idiraTotalPage = async <T>(
  ctx: ActionContext,
  options: IdiraRequestOptions & {
    offset: number;
    limit: number;
    field: string;
    /**
     * The API may ignore the paging parameters and return every item (Get users documents
     * pageOffset and pageSize for self-hosted vaults only). When more than `limit` items come
     * back, the answer is read as the whole list: the connector returns the page at `offset` of it
     * and the next offset itself.
     */
    pageLocallyWhenUnpaged?: boolean;
  }
): Promise<PageResult<T>> => {
  const { field, offset, limit, pageLocallyWhenUnpaged, ...request } = options;
  const { status, data } = await idiraRequest<Record<string, unknown>>(ctx, request);
  if (!isListBody(data, field)) {
    throw unexpectedListBodyError(request, status, data, field);
  }
  const items = data[field] as T[];
  const total = data.Total ?? data.total;
  if (pageLocallyWhenUnpaged && items.length > limit) {
    const value = items.slice(offset, offset + limit);
    const next = offset + limit;
    return {
      value,
      count: typeof total === 'number' ? total : items.length,
      ...(next < items.length ? { nextOffset: next } : {}),
    };
  }
  const value = items;
  const nextOffset = nextOffsetFromTotal(total, offset, value.length, limit);
  return {
    value,
    ...(typeof total === 'number' ? { count: total } : {}),
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

/** "userType eq X AND componentUser eq true AND userName eq Y", as the vendor SDK builds it, or undefined. */
export const buildUsersFilter = (conditions: {
  userType?: string;
  componentUser?: boolean;
  userName?: string;
}): string | undefined => {
  const parts = [
    conditions.userType ? `userType eq ${conditions.userType}` : undefined,
    conditions.componentUser === undefined
      ? undefined
      : `componentUser eq ${String(conditions.componentUser)}`,
    conditions.userName ? `userName eq ${conditions.userName}` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};

/** The URL path of a safe's members. */
export const membersPath = (safeName: string) => `/Safes/${pathSegment(safeName)}/Members`;

/**
 * One member of a safe. The vendor needs a trailing slash when the URL contains a dot (for
 * example jsmith@corp.example.com); without it the API answers 404.
 */
export const memberPath = (safeName: string, memberName: string) => {
  const path = `${membersPath(safeName)}/${pathSegment(memberName)}`;
  return memberName.includes('.') ? `${path}/` : path;
};
