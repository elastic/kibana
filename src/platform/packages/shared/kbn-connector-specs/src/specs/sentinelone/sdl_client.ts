/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError, RawAxiosRequestHeaders } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { getAuthHeaders, getConsoleOrigin, withRetry } from './client';
import { REQUEST_TIMEOUT_MS } from './constants';

/** The Singularity Data Lake API lives on the console host, beside the management API. */
export const SDL_API_PREFIX = '/sdl/v2/api';

/** Routing header the query service returns on every answer; poll and delete send it back. */
export const FORWARD_TAG_RESPONSE_HEADER = 'x-dataset-query-forward-tag';
export const FORWARD_TAG_REQUEST_HEADER = 'X-Dataset-Query-Forward-Tag';

const REDACTED = '[redacted]';
const MAX_DETAIL_LENGTH = 500;

export interface SdlRequest {
  action: string;
  method: 'GET' | 'POST' | 'DELETE';
  /** Path below /sdl/v2/api, with every caller value already encoded. */
  path: string;
  params?: Record<string, string | number>;
  body?: unknown;
  /** Extra request headers, for example the forward tag. */
  headers?: Record<string, string>;
  mutating: boolean;
}

export interface SdlResponse<T> {
  data: T;
  /** Response headers with lower-case names and string values. */
  headers: Record<string, string>;
}

interface LegacyErrorItem {
  code?: string | number;
  title?: string;
  detail?: string;
}

/**
 * Reads the stored token through getAuthHeaders, so the secret is handled in one place. The query
 * service wants it as `Authorization: Bearer <token>` (an ApiToken header gets an HTTP 500).
 */
const getStoredToken = (ctx: ActionContext): string => {
  const { Authorization } = getAuthHeaders(ctx);
  return String(Authorization).replace(/^ApiToken\s+/i, '');
};

/** Removes the token and the token tail some answers echo ("Couldn't decode API token ...abcde"). */
export const redactToken = (text: string, token: string): string => {
  const withoutToken = token.length > 0 ? text.split(token).join(REDACTED) : text;
  return withoutToken.replace(/(API token\s+)\.\.\.(?!\[redacted\])[\w-]+/gi, `$1...${REDACTED}`);
};

export const toHeaderRecord = (headers: unknown): Record<string, string> => {
  if (!headers || typeof headers !== 'object') return {};
  const source =
    typeof (headers as { toJSON?: unknown }).toJSON === 'function'
      ? (headers as { toJSON: () => Record<string, unknown> }).toJSON()
      : (headers as Record<string, unknown>);
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'string') out[name.toLowerCase()] = value;
    else if (typeof value === 'number') out[name.toLowerCase()] = String(value);
  }
  return out;
};

/** Returns the first complete JSON object at the start of a text, or undefined. */
const leadingJsonObject = (text: string): unknown => {
  const start = text.indexOf('{');
  if (start < 0 || text.slice(0, start).trim() !== '') return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
};

/** Plain text of an HTML or text body, without tags and scripts, shortened. */
const plainText = (text: string): string =>
  text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DETAIL_LENGTH);

const decode = (data: unknown): unknown => {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data as ArrayBuffer);
  }
  return data;
};

const describeDetails = (details: unknown): string | undefined => {
  if (!Array.isArray(details) || details.length === 0) return undefined;
  return details
    .map((item) => {
      if (!item || typeof item !== 'object') return String(item);
      const { field, message } = item as { field?: unknown; message?: unknown };
      return [field, message].filter((part) => part !== undefined && part !== '').join(': ');
    })
    .filter((part) => part !== '')
    .join('; ');
};

/**
 * Maps a query service error body to the management API shape `{errors: [{code, title, detail}]}`,
 * so the connector's error mapping renders it. Handles `{code, message, details[]}` (400, 404, 429,
 * 500), `{message, status}` (401) and a JSON object followed by an HTML page (500).
 */
export const toLegacyErrorBody = (
  data: unknown,
  token: string
): { errors: LegacyErrorItem[] } | string | undefined => {
  let body = decode(data);
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed === '') return undefined;
    const parsed = leadingJsonObject(trimmed);
    if (parsed === undefined) return redactToken(plainText(trimmed), token);
    body = parsed;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const { code, status, message, details } = body as Record<string, unknown>;
  const clean = (value: unknown): string | undefined =>
    typeof value === 'string' && value !== ''
      ? redactToken(value, token).slice(0, MAX_DETAIL_LENGTH)
      : undefined;
  const item: LegacyErrorItem = {
    code: typeof code === 'string' || typeof code === 'number' ? code : clean(status),
    title: clean(message),
    detail: clean(describeDetails(details)),
  };
  if (item.code === undefined && item.title === undefined && item.detail === undefined) {
    return redactToken(JSON.stringify(body), token).slice(0, MAX_DETAIL_LENGTH);
  }
  return { errors: [item] };
};

/** Copies an HTTP error with the body normalized and the token removed; other errors pass through. */
const normalizeError = (error: unknown, token: string): unknown => {
  const err = error as AxiosError;
  if (!err?.isAxiosError && !err?.response) return error;
  return Object.assign(new Error(redactToken(err.message ?? '', token)), {
    isAxiosError: true,
    code: err.code,
    response: err.response
      ? {
          status: err.response.status,
          statusText: err.response.statusText,
          headers: err.response.headers,
          data: toLegacyErrorBody(err.response.data, token),
        }
      : undefined,
  });
};

/**
 * Sends one request to the Singularity Data Lake API with the connector's retry policy and timeout
 * (the response size follows the Kibana Actions limit), and returns the body and the response headers.
 */
export const sdlRequest = async <T>(
  ctx: ActionContext,
  { action, method, path, params, body, headers, mutating }: SdlRequest
): Promise<SdlResponse<T>> => {
  const url = `${getConsoleOrigin(ctx)}${SDL_API_PREFIX}${path}`;
  const token = getStoredToken(ctx);
  const requestHeaders: RawAxiosRequestHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
    token: false,
  };
  const response = await withRetry(ctx, action, mutating, () =>
    ctx.client
      .request<T>({
        method,
        url,
        ...(params ? { params } : {}),
        ...(body !== undefined ? { data: body } : {}),
        headers: requestHeaders,
        timeout: REQUEST_TIMEOUT_MS,
      })
      .catch((error: unknown) => {
        throw normalizeError(error, token);
      })
  ).catch((error: unknown) => {
    // the mapped message carries the vendor's text: remove the token once more before it leaves
    throw error instanceof Error ? new Error(redactToken(error.message, token)) : error;
  });
  return { data: response.data, headers: toHeaderRecord(response.headers) };
};
