/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTING_CLONE_API_KEY_HEADER } from '@kbn/alerting-plugin/common';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import {
  ES_CLIENT_AUTHENTICATION_HEADER,
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import { applySpacePrefix } from '@kbn/workflows';
import {
  getOutboundEventChainHeaders,
  KibanaApiCallError,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/workflows-extensions/server';
import { isTextContentType, readResponseStream } from '../utils/http_response';

export { KibanaApiCallError } from '@kbn/workflows-extensions/server';

/**
 * Default cap on the response body size (bytes) when no per-step limit is supplied.
 * Matches the workflows execution engine default for `max-step-size` to keep behavior
 * consistent across the engine's two HTTP paths (this helper and the `kibana.request` step).
 */
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum number of characters of the (stringified) error body appended to the thrown
 * error's `message`. This only caps the human-readable log string; the full parsed body
 * (up to `maxResponseBytes`) is preserved on {@link KibanaApiCallError.body} for recovery.
 */
const ERROR_MESSAGE_BODY_MAX_CHARS = 1024 * 1024;

/**
 * Thrown by {@link callKibanaApi} when the response body exceeds the configured
 * size limit. Callers that need a richer (e.g. {@link ResponseSizeLimitError}-style)
 * error can `instanceof`-check this and rethrow as their own type.
 */
export class CallKibanaApiResponseTooLargeError extends Error {
  public readonly limitBytes: number;
  constructor(limitBytes: number) {
    super(`callKibanaApi: response body exceeded ${limitBytes} bytes and was truncated`);
    this.name = 'CallKibanaApiResponseTooLargeError';
    this.limitBytes = limitBytes;
  }
}

/**
 * Public input for `callKibanaApi`. Kept intentionally minimal: the transport (Core's HTTP
 * self client) is an implementation detail the caller-visible API does not expose.
 */
export type BufferedRawBody =
  | FormData
  | Blob
  | URLSearchParams
  | ArrayBuffer
  | ArrayBufferView<ArrayBuffer>;

export interface CallKibanaApiParams {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  target?: 'local';
  /**
   * Route path starting with `/`, e.g. `/api/cases`. By default the path is space-relative:
   * when `deps.spaceId` is a non-default space, it is prefixed with `/s/{spaceId}`.
   */
  path: string;
  /**
   * Set to `false` to send `path` as a Kibana-root path without adding the workflow space, so
   * `/api/cases` targets the default space and `/s/other/api/cases` targets `other`.
   * Defaults to `true`.
   */
  prefixSpace?: boolean;
  body?: unknown;
  /** Buffered non-JSON body, mutually exclusive with `body` (used for FormData uploads). */
  rawBody?: BufferedRawBody | null;
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Caller-supplied headers. Authentication, internal-origin, and event-chain headers are managed
   * by the helper. JSON requests default to `application/json`, while an explicit caller content
   * type is preserved; FormData controls its own multipart boundary.
   */
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Milliseconds to wait for response headers, including same-origin redirects. Defaults to
   * Core's self client timeout.
   */
  timeout?: number;
  /** Optional per-call response size cap. */
  maxResponseBytes?: number;
  /**
   * Byte cap for non-2xx bodies. When set, a larger error body is truncated to a string ending in
   * `... [truncated]` instead of failing the call. Defaults to `maxResponseBytes`.
   */
  maxErrorBodyBytes?: number;
}

export interface CallKibanaApiResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
  /** Absolute URL the self client actually requested. */
  url: string;
}

/**
 * Dependencies the helper needs from the workflow execution engine to perform a call
 * on behalf of the running workflow.
 */
export interface CallKibanaApiDeps {
  fakeRequest: KibanaRequest;
  workflowRunId?: string;
  coreStart: CoreStart;
  /**
   * Space the workflow is running in. When set to a non-default space, the request path is
   * prefixed with `/s/{spaceId}`. When omitted or `'default'`, the path is used as-is.
   */
  spaceId?: string;
  /**
   * Cap on the size of the response body in bytes. `0` disables the limit. When omitted,
   * `DEFAULT_MAX_RESPONSE_BYTES` is used.
   */
  maxResponseBytes?: number;
}

/**
 * Headers managed by the helper or rejected by Core's self client. Any caller-supplied value
 * for these keys is dropped so authentication, internal-origin marking, event-chain
 * propagation, and content negotiation stay under the engine's control.
 */
const RESERVED_HEADER_NAMES = new Set([
  ALERTING_CLONE_API_KEY_HEADER,
  'authorization',
  'kbn-xsrf',
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST.toLowerCase(),
  'x-kibana-event-chain-depth',
  'x-kibana-event-chain-source-execution-id',
  'x-kibana-event-chain-visited-workflows',
  'x-kibana-workflow-execution-id',
]);

/**
 * Mirrors `isProtectedHeader` in Core `self_client.ts`. Caller YAML that includes these names
 * must be dropped here; the self client rejects them before dispatch.
 */
const isCoreProtectedSelfCallHeader = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  return (
    lowerName === 'authorization' ||
    lowerName === 'cookie' ||
    lowerName === 'host' ||
    lowerName.startsWith('kbn-') ||
    lowerName === 'x-kbn-self-call' ||
    lowerName.startsWith('x-elastic-internal-') ||
    lowerName === UIAM_INTERNAL_CALLER_ATTESTATION_HEADER.toLowerCase() ||
    lowerName === ES_CLIENT_AUTHENTICATION_HEADER ||
    lowerName === 'es-secondary-x-client-authentication'
  );
};

/** Returns true for caller header names that {@link callKibanaApi} drops before dispatch. */
export const isIgnoredCallerHeader = (name: string): boolean =>
  RESERVED_HEADER_NAMES.has(name.toLowerCase()) || isCoreProtectedSelfCallHeader(name);

const stripReservedHeaders = (
  headers: Record<string, string> | undefined,
  isFormData: boolean
): Record<string, string> => {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const reserved =
      isIgnoredCallerHeader(name) || (isFormData && name.toLowerCase() === 'content-type');
    if (!reserved) {
      out[name] = value;
    }
  }
  return out;
};

const headersToRecord = (headers: Headers | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  if (headers === undefined) {
    return out;
  }
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};

const parseResponseBody = async (
  response: Response,
  maxResponseBytes: number,
  onExceed: 'throw' | 'truncate' = 'throw',
  signal?: AbortSignal
): Promise<unknown> => {
  if (response.status === 204 || response.status === 304) {
    return {};
  }
  if (!response.body) {
    return null;
  }
  const contentType = response.headers?.get('content-type') ?? null;
  const { buffer, truncated } = await readResponseStream(response, maxResponseBytes, signal);
  if (truncated) {
    if (onExceed === 'truncate') {
      return `${buffer.toString('utf-8')}... [truncated]`;
    }
    throw new CallKibanaApiResponseTooLargeError(maxResponseBytes);
  }
  if (buffer.byteLength === 0) {
    return null;
  }
  if (!isTextContentType(contentType)) {
    return buffer;
  }
  const text = buffer.toString('utf-8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Builds the human-readable body fragment appended to {@link KibanaApiCallError.message}.
 * Mirrors the previous `HTTP <status>: <body>` shape: objects are JSON-stringified, strings
 * are used verbatim, Buffers are decoded as UTF-8. The result is capped at
 * {@link ERROR_MESSAGE_BODY_MAX_CHARS} characters for log-safety; the full parsed value is
 * still available on {@link KibanaApiCallError.body}.
 */
const stringifyErrorBodyForMessage = (body: unknown): string => {
  if (body == null) return '';
  let text: string;
  if (typeof body === 'string') {
    text = body;
  } else if (Buffer.isBuffer(body)) {
    text = body.toString('utf-8');
  } else {
    try {
      text = JSON.stringify(body);
    } catch {
      text = String(body);
    }
  }
  return text.length > ERROR_MESSAGE_BODY_MAX_CHARS
    ? `${text.slice(0, ERROR_MESSAGE_BODY_MAX_CHARS)}... [truncated]`
    : text;
};

const validateKibanaApiPath = (path: string): void => {
  // Query and fragment are not path segments. `foo%2Fbar` in a query is a value, not traversal.
  const pathname = path.split(/[?#]/, 1)[0];
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    path.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(path)
  ) {
    throw new Error(`Invalid Kibana API path "${path}".`);
  }
  for (const segment of pathname.split('/')) {
    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error(`Invalid Kibana API path "${path}".`);
    }
    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      decodedSegment.includes('\\') ||
      decodedSegment.includes('/') ||
      /[\u0000-\u001F\u007F]/.test(decodedSegment)
    ) {
      throw new Error(`Invalid Kibana API path "${path}".`);
    }
  }
};

/**
 * Calls a Kibana HTTP route on the running Kibana instance using the workflow's fake request
 * for authentication and origin marking. Throws a {@link KibanaApiCallError} on non-2xx
 * responses (other than 304). Its `message` keeps the previous `HTTP <status>: <body>` shape,
 * and it additionally exposes the parsed `status`, `headers`, and `body` so callers can recover
 * a structured partial-success response via `try/catch` + `instanceof KibanaApiCallError`.
 *
 * This helper backs the `callKibanaApi` tool exposed to custom step handlers. Behavior is
 * intentionally kept narrow (no multipart, no fetcher options, no streaming).
 *
 * Transport is Core's HTTP self client (`coreStart.http.selfClient`): it owns URL resolution,
 * forwarding the scoped request's `authorization`, stamping `x-elastic-internal-origin` /
 * `kbn-version`, and the UIAM internal-caller attestation. This helper only supplies the headers
 * Core does not manage (custom + event-chain) and keeps its own response-shaping contract (size
 * cap, binary handling, structured {@link KibanaApiCallError}).
 */
export async function callKibanaApi<T = unknown>(
  deps: CallKibanaApiDeps,
  params: CallKibanaApiParams
): Promise<CallKibanaApiResult<T>> {
  const { fakeRequest, workflowRunId, coreStart, spaceId } = deps;
  const maxResponseBytes =
    params.maxResponseBytes ?? deps.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(fakeRequest);
  if (!authorizationHeader) {
    throw new Error('callKibanaApi: missing Authorization header on the workflow fake request');
  }

  // Only the headers Core's self client does not manage for us: caller-supplied custom headers
  // (reserved ones stripped) plus the engine's event-chain propagation. Authorization,
  // x-elastic-internal-origin, kbn-version/xsrf, and the UIAM internal-caller attestation are set
  // by the self client itself — the attestation is bound to the credential, so it has to be
  // derived per attempt by whoever chooses that credential. JSON requests receive a default
  // content type unless the caller supplied one.
  const callerHeaders = stripReservedHeaders(params.headers, params.rawBody instanceof FormData);
  const hasContentType = Object.keys(callerHeaders).some(
    (name) => name.toLowerCase() === 'content-type'
  );
  const outboundHeaders: Record<string, string> = {
    ...(!hasContentType && params.rawBody === undefined
      ? { 'content-type': 'application/json' }
      : {}),
    ...callerHeaders,
    ...getOutboundEventChainHeaders(fakeRequest, workflowRunId),
    // Our API key dies after the workflow run (Task Manager revokes it). This header tells alerting
    // to give any rule it creates or enables its own key instead of keeping ours.
    // Only alerting reads this header. Other routes ignore it, so it is safe to send on every call.
    // See: https://github.com/elastic/kibana/pull/291318
    [ALERTING_CLONE_API_KEY_HEADER]: 'true',
  };

  // Space-relative paths get the workflow space prefix exactly once. The server base path stays
  // outermost.
  validateKibanaApiPath(params.path);
  const routePath =
    params.prefixSpace === false ? params.path : applySpacePrefix(params.path, spaceId);
  const path = coreStart.http.basePath.prepend(routePath);
  const { request, response } = await coreStart.http.selfClient.asScoped(fakeRequest).fetch(path, {
    method: params.method,
    target: params.target,
    headers: outboundHeaders,
    query: params.query,
    body: params.body ?? undefined,
    rawBody: params.rawBody,
    // Mark the loopback as Kibana-internal so internal routes stay reachable.
    access: 'internal',
    asResponse: true,
    rawResponse: true,
    // Fake requests carry no base path. `createUrl` leaves `path` untouched when this is
    // false, so the string above must already include `server.basePath` when configured.
    prependBasePath: false,
    signal: params.signal,
    timeout: params.timeout,
  });

  // `Response.ok` is true only for 2xx; treat 304 Not Modified as a successful response with no body
  // so callers using conditional GETs see the same shape as a 204.
  if (!response.ok && response.status !== 304) {
    // Parse the error body via the same path as success so step authors can recover a structured
    // partial-success response without string-parsing the message.
    const errorBody =
      params.maxErrorBodyBytes === undefined
        ? await parseResponseBody(response, maxResponseBytes, 'throw', params.signal)
        : await parseResponseBody(response, params.maxErrorBodyBytes, 'truncate', params.signal);
    throw new KibanaApiCallError({
      status: response.status,
      headers: headersToRecord(response.headers),
      body: errorBody,
      message: `HTTP ${response.status}: ${stringifyErrorBodyForMessage(errorBody)}`,
      url: request.url,
    });
  }

  const body = (await parseResponseBody(response, maxResponseBytes, 'throw', params.signal)) as T;

  return {
    status: response.status,
    headers: headersToRecord(response.headers),
    body,
    url: request.url,
  };
}
