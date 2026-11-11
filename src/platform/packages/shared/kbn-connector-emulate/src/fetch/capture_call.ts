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
import type { ContractOperation } from '../openapi';
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
   * More keys whose values are redacted, such as Trello's `key`: compared after converting
   * camelCase and kebab-case to snake_case, the key itself or its end.
   */
  readonly redact?: readonly string[];
}

/** A request or response as captured: headers and body, with credentials redacted. */
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

/** The headers and bodies of one exchange, with credentials redacted. */
export interface CapturedExchange {
  readonly request: CapturedRequest;
  readonly response: CapturedMessage;
}

/**
 * Keys that carry credentials, redacted wherever they appear, after normalizing to snake_case.
 * Only credentials: cursors such as `page_token` or `nextToken` stay readable for debugging.
 */
const CREDENTIAL_KEYS = new Set([
  'authorization',
  'proxy_authorization',
  'cookie',
  'set_cookie',
  // Trello and others take the API token as a bare `token` parameter.
  'token',
  // JWT bearer grants (RFC 7523) and client assertions send a signed JWT.
  'assertion',
  'client_assertion',
]);

/** Keys redacted when they end in one of these, after normalizing to snake_case. */
const CREDENTIAL_SUFFIXES = [
  'api_key',
  'apikey',
  'application_key',
  'secret',
  'password',
  'private_key',
  'access_token',
  'refresh_token',
  'id_token',
  'auth_token',
  'api_token',
  'bearer_token',
  'security_token',
  'session_token',
];

/** Headers whose value starts with an auth scheme, which is kept: `Bearer [redacted]`. */
const SCHEME_KEYS = new Set(['authorization', 'proxy_authorization']);

const toSnakeCase = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

/** The redacted value of a credential key, or `undefined` when the key holds none. */
type RedactEntry = (key: string, value: unknown) => string | undefined;

/**
 * `redact` adds keys matched by their end; `names` adds keys matched whole, such as the
 * parameters a vendor's spec declares for its API keys, which can be as generic as `key`.
 */
const createRedactEntry = (
  redact: readonly string[] = [],
  names: readonly string[] = []
): RedactEntry => {
  const suffixes = [...CREDENTIAL_SUFFIXES, ...redact.map(toSnakeCase)];
  const exact = new Set([...CREDENTIAL_KEYS, ...names.map(toSnakeCase)]);
  return (key, value) => {
    const normalized = toSnakeCase(key);
    if (!exact.has(normalized) && !suffixes.some((end) => normalized.endsWith(end))) {
      return undefined;
    }
    const scheme =
      SCHEME_KEYS.has(normalized) && typeof value === 'string'
        ? /^(\S+)\s+\S/.exec(value)?.[1]
        : undefined;
    return scheme ? `${scheme} ${REDACTED}` : REDACTED;
  };
};

const redactValue = (value: unknown, redactEntry: RedactEntry): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redactEntry));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      redactEntry(key, item) ?? redactValue(item, redactEntry),
    ])
  );
};

const redactRecord = <T>(
  record: Readonly<Record<string, T>>,
  redactEntry: RedactEntry
): Record<string, T | string> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, redactEntry(key, value) ?? value])
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
  redactEntry: RedactEntry,
  maxBodyBytes: number
): Pick<CapturedMessage, 'body' | 'bodyTruncated'> => {
  if (body === undefined || body === null || body === '') {
    return {};
  }
  const redacted = redactValue(toStructuredBody(body, contentType), redactEntry);
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
 * The header and query parameters that carry API keys, as the vendor's spec declares them in its
 * `apiKey` security schemes, e.g. Figma's `X-Figma-Token` header or Trello's `key` parameter.
 */
export interface CredentialNames {
  readonly headers: readonly string[];
  readonly query: readonly string[];
}

const NO_CREDENTIAL_NAMES: CredentialNames = { headers: [], query: [] };

/** Collects the API key parameters of the security schemes the operations use. */
export const toCredentialNames = (operations: readonly ContractOperation[]): CredentialNames => {
  const headers = new Set<string>();
  const query = new Set<string>();
  for (const { security } of operations) {
    for (const { credential } of security.flat()) {
      if (credential?.in === 'header') {
        headers.add(credential.name);
      } else if (credential?.in === 'query') {
        query.add(credential.name);
      }
    }
  }
  return { headers: [...headers], query: [...query] };
};

const isCount = (value: unknown): boolean => Number.isInteger(value) && Number(value) >= 0;

/** Throws when a limit isn't a whole number of at least 0, which would break capturing. */
export const checkCaptureOptions = ({ maxCalls, maxBodyBytes }: CaptureOptions): void => {
  for (const [name, value] of [
    ['maxCalls', maxCalls],
    ['maxBodyBytes', maxBodyBytes],
  ] as const) {
    if (value !== undefined && !isCount(value)) {
      throw new Error(`capture.${name} must be a whole number of at least 0, got ${value}`);
    }
  }
};

/**
 * Creates a function that captures an exchange's headers, query and bodies. Values of keys that
 * carry credentials are replaced with `[redacted]` in headers, the query, and JSON and form
 * bodies, at any depth, keeping an auth header's scheme; then bodies longer than `maxBodyBytes` are
 * cut and flagged. Redaction keeps credentials out of logs and agent context by accident; it is
 * no security control, as whoever points Kibana at the emulator can read its traffic anyway.
 */
export const createCaptureExchange = (
  { maxBodyBytes = DEFAULT_MAX_CAPTURED_BODY_BYTES, redact }: CaptureOptions = {},
  credentials: CredentialNames = NO_CREDENTIAL_NAMES
): CaptureExchange => {
  const redactEntry = createRedactEntry(redact);
  const redactHeader = createRedactEntry(redact, credentials.headers);
  const redactQuery = createRedactEntry(redact, credentials.query);
  return (request, response) => ({
    request: {
      headers: redactRecord(request.headers, redactHeader),
      query: redactRecord(request.query, redactQuery),
      ...toBody(
        request.body,
        findHeader(request.headers, 'content-type'),
        redactEntry,
        maxBodyBytes
      ),
    },
    response: {
      headers: redactRecord(response.headers ?? {}, redactEntry),
      ...toBody(
        response.body,
        findHeader(response.headers, 'content-type'),
        redactEntry,
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
      // Bounded by the list too, so a limit below 0 can't keep the loop going.
      while (indices.length > limit && indices.length > 0) {
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
