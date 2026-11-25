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

/** Admin SDK host. Every Directory API and Reports API route sits below it. */
export const API_URL = 'https://admin.googleapis.com';
export const DIRECTORY_PATH = '/admin/directory/v1';
export const REPORTS_PATH = '/admin/reports/v1';

/** Per-request timeout. */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * The parts of Google's HTTP response the actions executor reads from a failed call: the status,
 * and Retry-After so the caller knows when it can try again.
 */
interface ErrorResponse {
  status: number;
  headers: Record<string, string>;
}

/** An error from the Admin SDK, with its HTTP status and Google's error reason. */
export class GoogleWorkspaceApiError extends Error {
  public readonly response?: ErrorResponse;

  constructor(
    message: string,
    public readonly status?: number,
    public readonly reason?: string,
    retryAfter?: string
  ) {
    super(message);
    this.name = 'GoogleWorkspaceApiError';
    if (status !== undefined) {
      this.response = { status, headers: retryAfter ? { 'retry-after': retryAfter } : {} };
    }
  }
}

export const isNotFound = (error: unknown): boolean =>
  error instanceof GoogleWorkspaceApiError && error.status === 404;

/** True for a request Google rejected with HTTP 400. */
export const isBadRequest = (error: unknown): boolean =>
  error instanceof GoogleWorkspaceApiError && error.status === 400;

/** 403 reasons that mean a rate limit or quota, not a missing privilege. */
const RATE_LIMIT_REASONS: ReadonlySet<string> = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'quotaExceeded',
]);

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

/** Google's error message and first reason from the standard error envelope. */
export const readGoogleError = (data: unknown): { message?: string; reason?: string } => {
  const body = (typeof data === 'object' && data !== null ? data : {}) as GoogleErrorBody;
  const error = body.error;
  const message = typeof error?.message === 'string' ? error.message : undefined;
  const reason = error?.errors?.find((e) => typeof e?.reason === 'string')?.reason;
  return { message, reason };
};

const isRateLimit = (status: number | undefined, reason: string | undefined): boolean =>
  status === 429 || (status === 403 && reason !== undefined && RATE_LIMIT_REASONS.has(reason));

/** Axios stops reading a response at xpack.actions.maxResponseContentLength with this message. */
const isResponseTooLarge = (error: unknown): boolean =>
  error instanceof Error && /maxContentLength size of .* exceeded/i.test(error.message);

export interface GoogleRequestOptions {
  method: Method;
  /** Path below the API URL, starting with "/". Every interpolated value must already be encoded. */
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  /** What the call acts on, for the 404 message, for example "User jdoe@example.com". */
  target: string;
}

/** Turns an Axios error into a message that says what failed and what to do next. */
export const formatGoogleError = (
  error: unknown,
  options: GoogleRequestOptions
): GoogleWorkspaceApiError => {
  if (isResponseTooLarge(error)) {
    return new GoogleWorkspaceApiError(
      'The Google Workspace response is larger than the xpack.actions.maxResponseContentLength setting allows. Request a smaller page with maxResults, or narrow the query.'
    );
  }
  // After a server error or a lost answer, a change may already be applied.
  const mayBeApplied =
    options.method.toUpperCase() === 'GET'
      ? ''
      : ' The change may have been applied: read the current state before you repeat the action.';
  if (!isAxiosError(error) || !error.response) {
    const reason = error instanceof Error ? error.message : String(error);
    return new GoogleWorkspaceApiError(
      `Google Workspace request failed: ${reason}.${mayBeApplied}`
    );
  }
  const { status } = error.response;
  const { message: googleMessage, reason } = readGoogleError(error.response.data);
  const text = googleMessage ?? error.message;

  let message: string;
  if (isRateLimit(status, reason)) {
    message = `Google Workspace rate limit reached: ${
      googleMessage ?? 'retry later'
    }. Wait and try again.`;
  } else if (status === 400) {
    message = `Google rejected the request: ${text}${reason ? ` (${reason})` : ''}.`;
  } else if (status === 401) {
    message =
      'Google Workspace authorization failed or expired: authorize the connector again or enter a new access token.';
  } else if (status === 403) {
    message = `The authorized account lacks the scope or admin privilege for this action: ${text}.`;
  } else if (status === 404) {
    message = `${options.target} not found: ${text}.`;
  } else if (status >= 500) {
    message = `Google Workspace is temporarily unavailable: ${status}${
      googleMessage ? ` (${googleMessage})` : ''
    }.`;
    message += mayBeApplied;
    if (options.params?.pageToken !== undefined) {
      // Google answers a malformed or foreign page token with 503 (seen live), not 400.
      message +=
        ' Check pageToken: it must be the nextPageToken of the previous page of the same request; Google answers an invalid token with a server error.';
    }
  } else {
    message = `Google Workspace error ${status}: ${text}${reason ? ` (${reason})` : ''}.`;
  }
  const retryAfter = error.response.headers?.['retry-after'];
  return new GoogleWorkspaceApiError(
    message,
    status,
    reason,
    typeof retryAfter === 'string' || typeof retryAfter === 'number'
      ? String(retryAfter)
      : undefined
  );
};

/**
 * Sends one request to the Admin SDK. Nothing is retried: a failure is returned with its HTTP
 * status and Retry-After, so the agent or the caller decides whether and when to try again.
 */
export const googleRequest = async <T>(
  ctx: ActionContext,
  options: GoogleRequestOptions
): Promise<{ status: number; data: T }> => {
  try {
    const response = await ctx.client.request<T>({
      method: options.method,
      url: `${API_URL}${options.path}`,
      params: options.params,
      data: options.data,
      timeout: REQUEST_TIMEOUT_MS,
      // Google does not redirect API calls; never carry the token to another host.
      maxRedirects: 0,
    });
    return { status: response.status, data: response.data };
  } catch (error) {
    throw formatGoogleError(error, options);
  }
};

/** A trimmed string, or undefined when the value is missing, blank or whitespace only. */
export const nonBlank = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/** Query parameters without the entries that are not set. */
export const compactParams = (
  params: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)) as Record<
    string,
    string | number | boolean
  >;

/** An array field of a response, or [] when Google leaves it out (it does for empty lists). */
export const arrayField = <T>(data: unknown, field: string): T[] => {
  const value = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return Array.isArray(value[field]) ? (value[field] as T[]) : [];
};

/** The nextPageToken of a list response, or undefined on the last page. */
export const nextPageToken = (data: unknown): string | undefined => {
  const value = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return typeof value.nextPageToken === 'string' && value.nextPageToken !== ''
    ? value.nextPageToken
    : undefined;
};

/** A copy of a Google resource without its kind and etag bookkeeping fields. */
export const withoutBookkeeping = <T extends Record<string, unknown>>(
  item: T
): Omit<T, 'kind' | 'etag'> =>
  Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== 'kind' && key !== 'etag')
  ) as Omit<T, 'kind' | 'etag'>;

/**
 * "/admin/directory/v1" plus the path segments, each one URL-encoded (fixed segments such as
 * "users" are unchanged by the encoding; caller values such as an email or ID are made safe).
 */
export const directoryPath = (...segments: Array<string | number>): string =>
  `${DIRECTORY_PATH}/${segments.map(encodeSegment).join('/')}`;

/**
 * URL-encodes one path segment. "." and ".." are refused: encodeURIComponent keeps them, and the
 * URL parser would then collapse them and send the request to a parent resource.
 */
export const encodeSegment = (segment: string | number): string => {
  const value = String(segment);
  if (value === '.' || value === '..') {
    throw new Error(`"${value}" is not a valid identifier`);
  }
  return encodeURIComponent(value);
};
