/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import {
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import { applySpacePrefix } from '@kbn/workflows';
import {
  getOutboundEventChainHeaders,
  KibanaApiCallError,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/workflows-extensions/server';
import { getInternalUiamCallerAttestationHeaders } from './get_internal_uiam_caller_attestation_headers';
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
export interface CallKibanaApiParams {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /**
   * Space-relative route path starting with `/`, e.g. `/api/cases`. When `deps.spaceId`
   * is a non-default space, it is prefixed with `/s/{spaceId}` automatically; pass the
   * path without a space segment.
   */
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Caller-supplied headers. Cross-cutting headers (Authorization, x-elastic-internal-origin-request,
   * event-chain headers, Content-Type) are managed by the helper and cannot be overridden.
   */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface CallKibanaApiResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
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
 * Headers managed by the helper. Any caller-supplied value for these keys is dropped to keep
 * authentication, internal-origin marking, event-chain propagation, and content negotiation
 * under the engine's control.
 */
const RESERVED_HEADER_NAMES = new Set([
  'authorization',
  'content-type',
  'kbn-xsrf',
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST.toLowerCase(),
  'x-kibana-event-chain-depth',
  'x-kibana-event-chain-source-execution-id',
  'x-kibana-event-chain-visited-workflows',
  'x-kibana-workflow-execution-id',
]);

const stripReservedHeaders = (
  headers: Record<string, string> | undefined
): Record<string, string> => {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!RESERVED_HEADER_NAMES.has(name.toLowerCase())) {
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
  maxResponseBytes: number
): Promise<unknown> => {
  if (response.status === 204 || response.status === 304) {
    return {};
  }
  if (!response.body) {
    return null;
  }
  const contentType = response.headers?.get('content-type') ?? null;
  const { buffer, truncated } = await readResponseStream(response, maxResponseBytes);
  if (truncated) {
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
 * forwarding the scoped request's `authorization`, and stamping `x-elastic-internal-origin` /
 * `kbn-version`, so this helper only supplies the headers Core does not manage (custom + event-chain
 * + the UIAM attestation) and keeps its own response-shaping contract (size cap, binary handling,
 * structured {@link KibanaApiCallError}).
 */
export async function callKibanaApi<T = unknown>(
  deps: CallKibanaApiDeps,
  params: CallKibanaApiParams
): Promise<CallKibanaApiResult<T>> {
  const { fakeRequest, workflowRunId, coreStart, spaceId } = deps;
  const maxResponseBytes = deps.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(fakeRequest);
  if (!authorizationHeader) {
    throw new Error('callKibanaApi: missing Authorization header on the workflow fake request');
  }

  // Only the headers Core's self client does not manage for us: caller-supplied custom headers
  // (reserved ones stripped) plus the engine's event-chain propagation. Authorization, Content-Type,
  // x-elastic-internal-origin, and kbn-version/xsrf are set by the self client itself.
  const outboundHeaders: Record<string, string> = {
    ...stripReservedHeaders(params.headers),
    ...getOutboundEventChainHeaders(fakeRequest, workflowRunId),
    ...getInternalUiamCallerAttestationHeaders(coreStart, fakeRequest),
  };

  // The workflow's fake request carries neither a space nor the server base path, so both have to
  // be encoded in the path. Apply the space first to keep the server base path outermost.
  const path = coreStart.http.basePath.prepend(applySpacePrefix(params.path, spaceId));
  const { response } = await coreStart.http.selfClient.asScoped(fakeRequest).fetch(path, {
    method: params.method,
    headers: outboundHeaders,
    query: params.query,
    body: params.body ?? undefined,
    // Mark the loopback as Kibana-internal so internal routes stay reachable.
    access: 'internal',
    asResponse: true,
    rawResponse: true,
    // The workflow fake request has no base path, and any space is already encoded in `path`.
    prependBasePath: false,
    signal: params.signal,
  });

  // `Response.ok` is true only for 2xx; treat 304 Not Modified as a successful response with no body
  // so callers using conditional GETs see the same shape as a 204.
  if (!response.ok && response.status !== 304) {
    // Parse the error body via the same path (and size limit) as success so step authors can
    // recover a structured partial-success response without string-parsing the message and
    // without the previous separate 1 MB cap.
    const errorBody = await parseResponseBody(response, maxResponseBytes);
    throw new KibanaApiCallError({
      status: response.status,
      headers: headersToRecord(response.headers),
      body: errorBody,
      message: `HTTP ${response.status}: ${stringifyErrorBodyForMessage(errorBody)}`,
    });
  }

  const body = (await parseResponseBody(response, maxResponseBytes)) as T;

  return {
    status: response.status,
    headers: headersToRecord(response.headers),
    body,
  };
}
