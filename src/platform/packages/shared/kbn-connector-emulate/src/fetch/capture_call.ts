/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { ContractRequest, ContractResponse } from '../contract/types';
import type { ContractCall } from './create_emulator_fetch';

/** What replaces the value of a key that may hold a secret. */
export const REDACTED = '[redacted]';

/** How many of the latest calls keep their capture, by default. */
export const DEFAULT_MAX_CAPTURED_CALLS = 100;

/** How many bytes of a body a capture keeps, by default. */
export const DEFAULT_MAX_CAPTURED_BODY_BYTES = 8 * 1024;

export interface CaptureOptions {
  /** How many of the latest calls keep their capture; older calls lose it. Default 100. */
  readonly maxCalls?: number;
  /** Bodies longer than this, serialized, are cut to it and flagged. Default 8 KiB. */
  readonly maxBodyBytes?: number;
  /**
   * More keys whose values are redacted, matched like the built-in ones: case-insensitively,
   * after converting camelCase and kebab-case to snake_case, the key itself or its end.
   */
  readonly redact?: readonly string[];
}

/** A request or response as captured: headers and body, with secrets redacted. */
export interface CapturedMessage {
  readonly headers: Readonly<Record<string, string>>;
  /** JSON and form bodies as values, other bodies as text; absent when there is none. */
  readonly body?: unknown;
  /** Set when the body was longer than `maxBodyBytes`: `body` is then its serialized start. */
  readonly bodyTruncated?: true;
}

export interface CapturedRequest extends CapturedMessage {
  readonly query: Readonly<Record<string, string | string[]>>;
}

/** The headers and bodies of one exchange, with secrets redacted. */
export interface CapturedExchange {
  readonly request: CapturedRequest;
  readonly response: CapturedMessage;
}

/** Keys redacted wherever they appear, after normalizing to snake_case. */
const SECRET_KEYS = new Set([
  'authorization',
  'proxy_authorization',
  'cookie',
  'set_cookie',
  // JWT bearer grants (RFC 7523) send the signed assertion in the token request's body.
  'assertion',
]);

/** Keys redacted when the key is one of these or ends in it, after normalizing to snake_case. */
const SECRET_SUFFIXES = ['token', 'secret', 'password', 'api_key', 'private_key'];

const toSnakeCase = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

const createIsSecret = (redact: readonly string[] = []): ((key: string) => boolean) => {
  const suffixes = [...SECRET_SUFFIXES, ...redact.map(toSnakeCase)];
  return (key) => {
    const normalized = toSnakeCase(key);
    return SECRET_KEYS.has(normalized) || suffixes.some((suffix) => normalized.endsWith(suffix));
  };
};

const redactValue = (value: unknown, isSecret: (key: string) => boolean): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, isSecret));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSecret(key) ? REDACTED : redactValue(item, isSecret),
    ])
  );
};

const redactRecord = <T>(
  record: Readonly<Record<string, T>>,
  isSecret: (key: string) => boolean
): Record<string, T | string> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, isSecret(key) ? REDACTED : value])
  );

const findHeader = (
  headers: Readonly<Record<string, string>> | undefined,
  name: string
): string | undefined =>
  Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];

const parseForm = (text: string): Record<string, string | string[]> => {
  const params = new URLSearchParams(text);
  const form: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    form[key] = values.length === 1 ? values[0] : values;
  }
  return form;
};

/** Parses text bodies whose content type says JSON or a form, so their keys can be redacted. */
const toStructuredBody = (body: unknown, contentType = ''): unknown => {
  if (typeof body !== 'string') {
    return body;
  }
  if (/x-www-form-urlencoded/i.test(contentType)) {
    return parseForm(body);
  }
  if (/json/i.test(contentType)) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
};

const toBody = (
  body: unknown,
  contentType: string | undefined,
  isSecret: (key: string) => boolean,
  maxBodyBytes: number
): Pick<CapturedMessage, 'body' | 'bodyTruncated'> => {
  if (body === undefined || body === null || body === '') {
    return {};
  }
  const redacted = redactValue(toStructuredBody(body, contentType), isSecret);
  const text = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  const bytes = Buffer.from(text);
  if (bytes.length <= maxBodyBytes) {
    return { body: redacted };
  }
  return { body: bytes.subarray(0, maxBodyBytes).toString(), bodyTruncated: true };
};

export type CaptureExchange = (
  request: ContractRequest,
  response: ContractResponse
) => CapturedExchange;

/**
 * Creates a function that captures an exchange's headers, query and bodies. Values of keys that
 * may hold secrets are replaced with `[redacted]` in headers, the query, and JSON and form bodies,
 * at any depth; then bodies longer than `maxBodyBytes` are cut and flagged.
 */
export const createCaptureExchange = ({
  maxBodyBytes = DEFAULT_MAX_CAPTURED_BODY_BYTES,
  redact,
}: CaptureOptions = {}): CaptureExchange => {
  const isSecret = createIsSecret(redact);
  return (request, response) => ({
    request: {
      headers: redactRecord(request.headers, isSecret),
      query: redactRecord(request.query, isSecret),
      ...toBody(request.body, findHeader(request.headers, 'content-type'), isSecret, maxBodyBytes),
    },
    response: {
      headers: redactRecord(response.headers ?? {}, isSecret),
      ...toBody(
        response.body,
        findHeader(response.headers, 'content-type'),
        isSecret,
        maxBodyBytes
      ),
    },
  });
};

/** The call without its capture. */
export const withoutCapture = (call: ContractCall): ContractCall => omit(call, 'captured');

export interface CaptureWindow {
  /** Notes that `calls[index]` has a capture, dropping it from the oldest calls beyond the limit. */
  readonly add: (index: number) => void;
  /** Forgets every noted index, e.g. after `calls` is emptied or its calls moved. */
  readonly clear: () => void;
}

/**
 * Keeps captures on the latest `limit` calls of `calls`, replacing older calls with copies
 * without one. Calls stay where they are, so indices into `calls` keep their meaning.
 */
export const createCaptureWindow = (calls: ContractCall[], limit: number): CaptureWindow => {
  const indices: number[] = [];
  return {
    add: (index) => {
      indices.push(index);
      while (indices.length > limit) {
        const oldest = indices.shift();
        if (oldest !== undefined && calls[oldest]) {
          calls[oldest] = withoutCapture(calls[oldest]);
        }
      }
    },
    clear: () => {
      indices.length = 0;
    },
  };
};
