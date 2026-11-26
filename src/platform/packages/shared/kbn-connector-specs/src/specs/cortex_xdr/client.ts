/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import type { AxiosResponse, ResponseType } from 'axios';
import type { ActionContext } from '../../connector_spec';
import {
  ACTION_BUDGET_MS,
  API_PREFIX,
  MIN_REQUEST_BUDGET_MS,
  PAGE_SIZE,
  REQUEST_TIMEOUT_MS,
  RETRYABLE_READ_STATUSES,
  RETRYABLE_WRITE_STATUSES,
  RETRY_BASE_DELAY_MS,
  RETRY_JITTER_MAX_MS,
  RETRY_MAX_ATTEMPTS,
  RETRY_MAX_DELAY_MS,
} from './constants';

/** Indirection so tests can skip the retry waits and move the clock. */
export const timing = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  now: (): number => Date.now(),
};

/** An error from the Cortex XDR API, with its HTTP status when there was a response. */
export class CortexXdrError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    /** True when the response body was larger than the request's maxResponseBytes. */
    public readonly tooLarge = false,
    /** True when the run's time budget was spent before or during the request. */
    public readonly budgetExceeded = false
  ) {
    super(message);
    this.name = 'CortexXdrError';
  }
}

/** Each run gets a fresh context; its deadline is set by its first request. */
const deadlines = new WeakMap<ActionContext, number>();

/** Milliseconds left of this run's time budget (ACTION_BUDGET_MS from its first request). */
export const remainingBudgetMs = (ctx: ActionContext): number => {
  let deadline = deadlines.get(ctx);
  if (deadline === undefined) {
    deadline = timing.now() + ACTION_BUDGET_MS;
    deadlines.set(ctx, deadline);
  }
  return deadline - timing.now();
};

const budgetError = (path: string): CortexXdrError =>
  new CortexXdrError(
    `The action stopped before finishing ${path}: it used its ${
      ACTION_BUDGET_MS / 1000
    } s time budget (Kibana ends a connector run after about 120 s). Send fewer ids or a smaller maxResults, or continue from the partial result.`,
    undefined,
    false,
    true
  );

/** The configured API URL without a trailing slash or a pasted /public_api/v1 suffix. */
export const getApiUrl = (ctx: ActionContext): string => {
  const apiUrl = String(ctx.config?.apiUrl ?? '').trim();
  if (!apiUrl) {
    throw new CortexXdrError('The Cortex XDR connector has no API URL configured.');
  }
  return apiUrl.replace(/\/+$/, '').replace(/\/public_api\/v1$/, '');
};

/** The base every route is appended to: <API URL>/public_api/v1. */
export const getApiBase = (ctx: ActionContext): string => `${getApiUrl(ctx)}${API_PREFIX}`;

const MAX_DETAIL_LENGTH = 500;

const describeDetail = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}...` : text;
};

/** The vendor's error text: reply.err_msg and reply.err_extra, or the same fields at the top level. */
export const vendorErrorText = (data: unknown): string => {
  if (typeof data === 'string') return describeDetail(data);
  if (typeof data !== 'object' || data === null) return '';
  const body = data as Record<string, unknown>;
  const reply = (
    typeof body.reply === 'object' && body.reply !== null ? body.reply : body
  ) as Record<string, unknown>;
  return [describeDetail(reply.err_msg), describeDetail(reply.err_extra)].filter(Boolean).join(' ');
};

const NO_ENDPOINT_PATTERN = /no endpoint was found/i;

export interface ErrorContext {
  /** True for calls that change state in Cortex XDR. */
  readonly stateChanging?: boolean;
  /** Message for a 404 on a route that takes an id in its path. */
  readonly notFoundMessage?: string;
}

/** Maps an HTTP status and vendor body to the connector's error message. */
export const describeHttpError = (
  status: number,
  data: unknown,
  { stateChanging = false, notFoundMessage }: ErrorContext = {}
): string => {
  const detail = vendorErrorText(data);
  const suffix = detail ? `: ${detail}` : '';
  switch (status) {
    case 400:
      return `Cortex XDR rejected the request (HTTP 400)${suffix}`;
    case 401:
      return 'Cortex XDR authentication failed (HTTP 401): check the API key ID and the Advanced API key, that the key has not expired, and that the Kibana host clock is correct (each request carries a signed timestamp).';
    case 402:
      return `The Cortex XDR tenant does not have the license this action needs (HTTP 402)${suffix}`;
    case 403:
      return `The API key's role lacks the permission for this action (HTTP 403)${suffix}. See the permissions table on the connector documentation page.`;
    case 404:
      return notFoundMessage ?? `Cortex XDR returned 404 Not Found${suffix}`;
    case 429:
      return `Cortex XDR rate limit reached (10 requests per second per tenant); retried ${RETRY_MAX_ATTEMPTS} times. Try again later or reduce parallel runs.`;
    default:
      if (status >= 500) {
        if (stateChanging && NO_ENDPOINT_PATTERN.test(detail)) {
          return `None of the endpoint ids match an endpoint that can run this action (HTTP ${status})${suffix}`;
        }
        return `Cortex XDR internal error (HTTP ${status})${suffix}${
          stateChanging
            ? '. The request was not retried because the action may already have been dispatched.'
            : ''
        }`;
      }
      return `Cortex XDR request failed (HTTP ${status})${suffix}`;
  }
};

export const retryDelayMs = (attempt: number): number =>
  Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)) +
  Math.floor(Math.random() * RETRY_JITTER_MAX_MS);

export interface XdrRequest extends ErrorContext {
  /** Route below /public_api/v1, already encoded, e.g. '/endpoints/get_endpoint'. */
  readonly path: string;
  readonly method?: 'POST' | 'GET';
  readonly body?: unknown;
  readonly responseType?: ResponseType;
  /** Response size cap; only the archive download of getRetrievedFileDetails sets one. */
  readonly maxResponseBytes?: number;
}

/**
 * Sends one request to the tenant and returns the response. The auth type signs every attempt
 * anew. Redirects are never followed, so the key headers stay on the configured host. Rate limits
 * and transient errors are retried with backoff (only 429 for state-changing calls); everything
 * else is raised at once as a CortexXdrError.
 */
export const xdrRequest = async <T = unknown>(
  ctx: ActionContext,
  request: XdrRequest
): Promise<AxiosResponse<T>> => {
  const url = `${getApiBase(ctx)}${request.path}`;
  const retryable = request.stateChanging ? RETRYABLE_WRITE_STATUSES : RETRYABLE_READ_STATUSES;
  for (let attempt = 1; ; attempt++) {
    const remaining = remainingBudgetMs(ctx);
    if (remaining < MIN_REQUEST_BUDGET_MS) throw budgetError(request.path);
    // Each request gets at most what is left of the run's budget as its timeout.
    const timeout = Math.min(REQUEST_TIMEOUT_MS, remaining);
    let response: AxiosResponse<T>;
    try {
      response = await ctx.client.request<T>({
        method: request.method ?? 'POST',
        url,
        data: request.body,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout,
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 200 && status < 400,
        ...(request.responseType ? { responseType: request.responseType } : {}),
        ...(request.maxResponseBytes ? { maxContentLength: request.maxResponseBytes } : {}),
      });
    } catch (error) {
      if (!isAxiosError(error) || !error.response) {
        if (isAxiosError(error) && /maxContentLength/i.test(error.message)) {
          throw new CortexXdrError('The response is larger than the size limit.', undefined, true);
        }
        const timedOut =
          isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');
        if (timedOut && timeout < REQUEST_TIMEOUT_MS) throw budgetError(request.path);
        const host = new URL(url).host;
        const reason = isAxiosError(error) ? error.code ?? error.message : String(error);
        throw new CortexXdrError(
          `Kibana cannot reach the Cortex XDR API host ${host} (${reason}): check the API URL and that Kibana can reach it over HTTPS (port 443).`
        );
      }
      const { status, data } = error.response;
      const delay = retryDelayMs(attempt);
      // A retry that could not start before the budget ends is not waited for.
      const retryFits = delay + MIN_REQUEST_BUDGET_MS <= remainingBudgetMs(ctx);
      if (retryable.includes(status) && attempt < RETRY_MAX_ATTEMPTS && retryFits) {
        ctx.log.debug(
          `Cortex XDR answered HTTP ${status} to ${request.path}; retry ${attempt}/${
            RETRY_MAX_ATTEMPTS - 1
          } in ${delay} ms`
        );
        await timing.sleep(delay);
        continue;
      }
      if (retryable.includes(status) && attempt < RETRY_MAX_ATTEMPTS) {
        throw new CortexXdrError(
          `Cortex XDR answered HTTP ${status} to ${request.path} and the action's ${
            ACTION_BUDGET_MS / 1000
          } s time budget left no time to retry it.`,
          status,
          false,
          true
        );
      }
      throw new CortexXdrError(describeHttpError(status, data, request), status);
    }
    if (response.status >= 300) {
      const location = String(response.headers?.location ?? 'an unknown location');
      throw new CortexXdrError(
        `Cortex XDR answered with a redirect (HTTP ${response.status}) to ${location}. Check the API URL: it must be the API URL shown when the key was created, for example https://api-mytenant.xdr.us.paloaltonetworks.com. Redirects are not followed so the API key headers are only sent to the configured host.`,
        response.status
      );
    }
    return response;
  }
};

/** POSTs { request_data } to a route and returns the response body. */
export const xdrPost = async <T = unknown>(
  ctx: ActionContext,
  path: string,
  requestData: unknown,
  context: ErrorContext = {}
): Promise<T> => {
  const response = await xdrRequest<T>(ctx, {
    ...context,
    path,
    body: { request_data: requestData },
  });
  return response.data;
};

export interface Filter {
  readonly field: string;
  readonly operator: string;
  readonly value: unknown;
}

/** Adds a filter when its value was given (and, for lists, is not empty). */
export const pushFilter = (
  filters: Filter[],
  field: string,
  operator: string,
  value: unknown
): void => {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return;
  filters.push({ field, operator, value });
};

export const endpointIdFilter = (endpointIds: readonly string[]): Filter[] => [
  { field: 'endpoint_id_list', operator: 'in', value: [...endpointIds] },
];

export interface PageRequest<TBody> {
  readonly path: string;
  /** request_data without search_from/search_to. */
  readonly requestData: Record<string, unknown>;
  readonly searchFrom: number;
  readonly maxResults: number;
  /** The rows of one page. */
  readonly itemsOf: (body: TBody) => unknown[] | undefined;
  /** The total the vendor reports for the query, when it reports one. */
  readonly totalOf: (body: TBody) => number | undefined;
}

export interface PageResult<TBody> {
  readonly items: unknown[];
  /** The last page's body, for the vendor's counts. */
  readonly lastBody: TBody;
  readonly pagesFetched: number;
  /** The offset to pass as searchFrom to continue, or null when the end was reached. */
  readonly nextSearchFrom: number | null;
  /** True when the time budget ended the read early; the pages already read are kept. */
  readonly timedOut?: boolean;
}

/** The paging fields every list action returns. */
export const pageInfo = (page: PageResult<unknown>) => ({
  pagesFetched: page.pagesFetched,
  nextSearchFrom: page.nextSearchFrom,
  ...(page.timedOut ? { timedOut: true } : {}),
});

/**
 * Reads pages of at most 100 rows (search_from/search_to) from searchFrom until maxResults rows,
 * a short page, or the vendor's total. Each page re-sends the same filters. When the time budget
 * runs out after the first page, the rows read so far are returned with timedOut and nextSearchFrom.
 */
export const collectPages = async <TBody>(
  ctx: ActionContext,
  { path, requestData, searchFrom, maxResults, itemsOf, totalOf }: PageRequest<TBody>
): Promise<PageResult<TBody>> => {
  const items: unknown[] = [];
  let from = searchFrom;
  let pagesFetched = 0;
  let lastBody: TBody | undefined;
  let ended = false;
  while (items.length < maxResults) {
    const size = Math.min(PAGE_SIZE, maxResults - items.length);
    let body: TBody;
    try {
      body = await xdrPost<TBody>(ctx, path, {
        ...requestData,
        search_from: from,
        search_to: from + size,
      });
    } catch (error) {
      if (pagesFetched > 0 && error instanceof CortexXdrError && error.budgetExceeded) {
        return {
          items,
          lastBody: lastBody as TBody,
          pagesFetched,
          nextSearchFrom: from,
          timedOut: true,
        };
      }
      throw error;
    }
    lastBody = body;
    pagesFetched++;
    const page = itemsOf(body) ?? [];
    items.push(...page.slice(0, size));
    from += Math.min(page.length, size);
    const total = totalOf(body);
    if (page.length < size || (total !== undefined && from >= total)) {
      ended = true;
      break;
    }
  }
  return {
    items,
    lastBody: lastBody as TBody,
    pagesFetched,
    nextSearchFrom: ended ? null : from,
  };
};

/** Bare-boolean confirmations (tags, hash lists): true, or { reply: true }. */
export const isConfirmed = (data: unknown): boolean =>
  data === true ||
  (typeof data === 'object' && data !== null && (data as { reply?: unknown }).reply === true);

export const notConfirmedError = (data: unknown): CortexXdrError => {
  const detail = vendorErrorText(data) || describeDetail(data);
  return new CortexXdrError(
    `Cortex XDR did not confirm the change${
      detail ? `: ${detail}` : ' (the response was not true)'
    }`
  );
};

/** Returns a number given as a number or a string of digits. */
export const toInteger = (value: number | string): number =>
  typeof value === 'number' ? value : Number.parseInt(value, 10);
