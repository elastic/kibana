/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage } from 'http';
import { STATUS_CODES } from 'http';
import * as stream from 'stream';
import typeDetect from 'type-detect';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { isResponseError as isElasticsearchResponseError } from '@kbn/es-errors';
import type { ResponseError, ResponseErrorAttributes } from '@kbn/core-http-server';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';

/** Mirrors `getServerOptions` default `routes.cache` for Hapi (`@kbn/server-http-tools`). */
const HAPI_DEFAULT_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate';

const INTERNAL_ERROR_MESSAGE =
  'An internal server error occurred. Check Kibana server logs for details.';

const statusHelpers = {
  isSuccess: (code: number) => code >= 100 && code < 300,
  isNotModified: (code: number) => code === 304,
  isRedirect: (code: number) => code >= 300 && code < 400 && code !== 304,
  isError: (code: number) => code >= 400 && code < 600,
};

/** RFC 7230 Section 6.1 — must not be forwarded by proxies to the client response. */
const HOP_BY_HOP_HEADER_NAMES = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function isIncomingMessagePayload(payload: unknown): payload is IncomingMessage {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as IncomingMessage;
  return (
    typeof candidate.headers === 'object' &&
    candidate.headers !== null &&
    typeof candidate.statusCode === 'number'
  );
}

/**
 * Detects bodies that must bypass Kibana's JSON error envelope and be forwarded as raw bytes/streams.
 *
 * Mirrors {@link HapiResponseAdapter.toError} plus {@link stream.isReadable} (see `isStreamOrBuffer` there)
 * and aligns with Fastify's own stream detection (`typeof payload.pipe === 'function'` in `Reply#send`),
 * so alternate `Readable` identities (e.g. duplicate `stream` module graphs) still stream correctly.
 */
function isOpaqueErrorBody(payload: unknown): boolean {
  // Boom and other `Error` subclasses must never be treated as opaque bodies: nested
  // `{ message: boom }` payloads (e.g. content_management `wrapError`) need `getErrorMessage`
  // to read `error.message`, not recurse into stream/buffer detection on the Boom object.
  if (payload instanceof Error) {
    return false;
  }
  if (Buffer.isBuffer(payload)) {
    return true;
  }
  if (isIncomingMessagePayload(payload)) {
    return true;
  }
  if (payload instanceof stream.Readable) {
    return true;
  }
  if (stream.isReadable(payload as stream.Readable) === true) {
    return true;
  }
  if (typeof payload === 'object' && payload !== null) {
    const candidate = payload as { pipe?: unknown; read?: unknown; readable?: unknown };
    if (
      typeof candidate.pipe === 'function' &&
      (typeof candidate.read === 'function' || typeof candidate.readable === 'boolean')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Hapi copies {@link IncomingMessage} headers onto the outgoing response when the body is a proxied
 * Node client response; Fastify only streams bytes unless we set headers explicitly.
 */
/**
 * Session/auth code may set `Set-Cookie` on `reply.raw` before {@link FastifyReply#send}; copy those
 * onto the Fastify reply so they are not dropped when the route handler responds.
 */
/** @internal */
export async function flushPendingCookieWrites(req: FastifyRequest | undefined): Promise<void> {
  if (!req) {
    return;
  }
  const app = (req as { app?: { pendingCookieWrites?: Array<Promise<unknown>> } }).app;
  const pending = app?.pendingCookieWrites;
  if (!pending?.length) {
    return;
  }
  await Promise.all(pending);
  app!.pendingCookieWrites = [];
}

/** @internal */
export function syncNodeResponseHeadersToFastifyReply(reply: FastifyReply): void {
  const raw = reply.raw;
  if (!raw || typeof raw.getHeader !== 'function') {
    return;
  }
  const setCookie = raw.getHeader('Set-Cookie');
  if (setCookie === undefined) {
    return;
  }
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    if (cookie !== undefined) {
      reply.header('set-cookie', cookie);
    }
  }
}

function applyIncomingMessageHeaders(reply: FastifyReply, incoming: IncomingMessage): void {
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value === undefined) continue;
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADER_NAMES.has(lower)) continue;
    if (reply.hasHeader(name)) continue;
    reply.header(name, value);
  }
}

/** Hapi appends `; charset=utf-8` to `text/*` types that omit a charset (e.g. reporting CSV). */
function appendUtf8CharsetToTextContentType(contentType: string): string {
  const lower = contentType.toLowerCase();
  if (lower.startsWith('text/') && !lower.includes('charset=')) {
    return `${contentType}; charset=utf-8`;
  }
  return contentType;
}

function ensureHapiCompatibleTextCharset(reply: FastifyReply): void {
  const headers = typeof reply.getHeaders === 'function' ? reply.getHeaders() : {};
  const raw = headers['content-type'] ?? headers['Content-Type'];
  const typeStr = Array.isArray(raw) ? raw[0] : raw;
  if (typeof typeStr !== 'string') {
    return;
  }
  const withCharset = appendUtf8CharsetToTextContentType(typeStr);
  if (withCharset !== typeStr) {
    reply.header('content-type', withCharset);
  }
}

/**
 * Adapts a {@link KibanaResponse} produced by a route handler to a Fastify reply.
 *
 * Mirrors {@link HapiResponseAdapter} so that error and success bodies preserve the
 * long-standing wire shape (`{ statusCode, error, message, ... }` for errors).
 *
 * @internal
 */
export class FastifyResponseAdapter {
  public async handle(kibanaResponse: unknown, reply: FastifyReply): Promise<FastifyReply> {
    if (!(kibanaResponse instanceof KibanaResponse)) {
      throw new Error(
        `Unexpected result from Route Handler. Expected KibanaResponse, but given: ${typeDetect(
          kibanaResponse
        )}.`
      );
    }
    return await this.toFastifyReply(kibanaResponse, reply);
  }

  private async toFastifyReply(
    kibanaResponse: KibanaResponse,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    if (kibanaResponse.options.bypassErrorFormat) {
      return await this.toSuccess(kibanaResponse, reply);
    }
    // Error responses whose body is already wire-format bytes/streams must not be wrapped in the
    // Kibana JSON error envelope. Delegate to `toSuccess` so Fastify applies the same `Reply#send`
    // stream detection as successful responses (see `HapiResponseAdapter.toError` opaque branch).
    if (statusHelpers.isError(kibanaResponse.status) && isOpaqueErrorBody(kibanaResponse.payload)) {
      return await this.toSuccess(kibanaResponse, reply);
    }
    if (statusHelpers.isError(kibanaResponse.status)) {
      return await this.toError(kibanaResponse, reply);
    }
    if (
      statusHelpers.isSuccess(kibanaResponse.status) ||
      statusHelpers.isNotModified(kibanaResponse.status)
    ) {
      return await this.toSuccess(kibanaResponse, reply);
    }
    if (statusHelpers.isRedirect(kibanaResponse.status)) {
      return await this.toRedirect(kibanaResponse, reply);
    }
    throw new Error(
      `Unexpected Http status code. Expected from 100 to 599, but given: ${kibanaResponse.status}.`
    );
  }

  private formatHapiEtagHeader(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value;
    }
    return `"${value}"`;
  }

  private applyHeaders(reply: FastifyReply, headers?: Record<string, string | string[]>) {
    if (!headers) return;
    for (const [name, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      if (name.toLowerCase() === 'etag' && typeof value === 'string') {
        reply.header(name, this.formatHapiEtagHeader(value));
        continue;
      }
      reply.header(name, value);
    }
  }

  private shouldReturnNotModified(
    reply: FastifyReply,
    headers?: Record<string, string | string[]>
  ): boolean {
    if (!headers) {
      return false;
    }
    const etagHeader = Object.keys(headers).find((name) => name.toLowerCase() === 'etag');
    if (!etagHeader) {
      return false;
    }
    const etagValue = headers[etagHeader];
    const etag = Array.isArray(etagValue) ? etagValue[0] : etagValue;
    const ifNoneMatch = reply.request.headers['if-none-match'];
    if (typeof etag !== 'string' || typeof ifNoneMatch !== 'string') {
      return false;
    }
    const normalize = (raw: string) =>
      raw.trim().replace(/^W\//, '').replace(/^"/, '').replace(/"$/, '');
    return normalize(ifNoneMatch) === normalize(etag);
  }

  private applyHapiCompatiblePayloadHeaders(
    reply: FastifyReply,
    payload: unknown,
    hasExplicitContentType: boolean
  ): void {
    if (Buffer.isBuffer(payload)) {
      if (!hasExplicitContentType && !reply.hasHeader('content-type')) {
        reply.header('content-type', 'application/octet-stream');
      }
      if (!reply.hasHeader('content-length')) {
        reply.header('content-length', String(payload.length));
      }
    } else {
      const isStreamBody =
        !isIncomingMessagePayload(payload) &&
        (payload instanceof stream.Readable ||
          stream.isReadable(payload as stream.Readable) === true ||
          (typeof payload === 'object' &&
            payload !== null &&
            typeof (payload as { pipe?: unknown }).pipe === 'function'));

      if (isStreamBody && !hasExplicitContentType && !reply.hasHeader('content-type')) {
        reply.header('content-type', 'application/octet-stream');
      }
    }

    ensureHapiCompatibleTextCharset(reply);
  }

  private ensureJsonSerializablePayload(payload: unknown): boolean {
    if (payload === null || typeof payload !== 'object') {
      return true;
    }
    if (Buffer.isBuffer(payload) || isIncomingMessagePayload(payload)) {
      return true;
    }
    if (payload instanceof stream.Readable || stream.isReadable(payload as stream.Readable)) {
      return true;
    }
    try {
      JSON.stringify(payload);
      return true;
    } catch {
      return false;
    }
  }

  private applyDefaultCacheControl(reply: FastifyReply, kibanaResponse: KibanaResponse): void {
    if (reply.hasHeader('cache-control')) {
      return;
    }
    const h = kibanaResponse.options.headers;
    if (h && Object.keys(h).some((k) => k.toLowerCase() === 'cache-control')) {
      return;
    }
    reply.header('cache-control', HAPI_DEFAULT_CACHE_CONTROL);
  }

  private async toSuccess(
    kibanaResponse: KibanaResponse,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    await flushPendingCookieWrites(reply.request);
    syncNodeResponseHeadersToFastifyReply(reply);
    if (this.shouldReturnNotModified(reply, kibanaResponse.options.headers)) {
      reply.code(304);
      this.applyHeaders(reply, kibanaResponse.options.headers);
      this.applyDefaultCacheControl(reply, kibanaResponse);
      return reply.send();
    }
    reply.code(kibanaResponse.status);
    this.applyHeaders(reply, kibanaResponse.options.headers);
    const payload = kibanaResponse.payload;
    if (isIncomingMessagePayload(payload)) {
      applyIncomingMessageHeaders(reply, payload);
    }
    const hasExplicitContentType = Boolean(
      kibanaResponse.options.headers &&
        Object.keys(kibanaResponse.options.headers).some((k) => k.toLowerCase() === 'content-type')
    );
    if (
      typeof payload === 'string' &&
      !hasExplicitContentType &&
      !reply.hasHeader('content-type')
    ) {
      reply.header('content-type', 'text/html; charset=utf-8');
    }
    this.applyHapiCompatiblePayloadHeaders(reply, payload, hasExplicitContentType);
    this.applyDefaultCacheControl(reply, kibanaResponse);
    if (!this.ensureJsonSerializablePayload(payload)) {
      // Hapi fails while serializing the response (e.g. circular JSON) without logging.
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: INTERNAL_ERROR_MESSAGE,
      });
    }
    return reply.send(payload);
  }

  private async toRedirect(
    kibanaResponse: KibanaResponse,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    await flushPendingCookieWrites(reply.request);
    syncNodeResponseHeadersToFastifyReply(reply);
    const { headers } = kibanaResponse.options;
    const location = headers && typeof headers.location === 'string' ? headers.location : undefined;
    if (!location) {
      throw new Error("expected 'location' header to be set");
    }
    this.applyHeaders(reply, kibanaResponse.options.headers);
    this.applyDefaultCacheControl(reply, kibanaResponse);
    reply.code(kibanaResponse.status);
    reply.header('location', location);
    const payload = kibanaResponse.payload;
    return reply.send(payload !== undefined && payload !== null ? payload : '');
  }

  private async toError(
    kibanaResponse: KibanaResponse<ResponseError>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    await flushPendingCookieWrites(reply.request);
    syncNodeResponseHeadersToFastifyReply(reply);
    const { payload } = kibanaResponse;

    // Streaming/buffer errors are passed through opaquely (e.g. proxied responses).
    if (isOpaqueErrorBody(payload)) {
      reply.code(kibanaResponse.status);
      this.applyHeaders(reply, kibanaResponse.options.headers);
      if (isIncomingMessagePayload(payload)) {
        applyIncomingMessageHeaders(reply, payload);
      }
      this.applyDefaultCacheControl(reply, kibanaResponse);
      return reply.send(kibanaResponse.payload);
    }

    const errorBody: {
      statusCode: number;
      error: string;
      message: string;
      attributes?: ResponseErrorAttributes;
    } = {
      statusCode: kibanaResponse.status,
      error: httpStatusToErrorLabel(kibanaResponse.status),
      message: getErrorMessage(payload),
    };

    const attributes = getErrorAttributes(payload);
    if (attributes) errorBody.attributes = attributes;

    reply.code(kibanaResponse.status);
    this.applyHeaders(reply, kibanaResponse.options.headers);
    this.applyDefaultCacheControl(reply, kibanaResponse);
    return reply.send(errorBody);
  }
}

function httpStatusToErrorLabel(statusCode: number): string {
  // Hapi/Boom use lowercase "teapot" for 418 (Node's `http.STATUS_CODES` title-cases it).
  if (statusCode === 418) {
    return "I'm a teapot";
  }
  return STATUS_CODES[statusCode] ?? 'Error';
}

function getErrorMessage(payload?: ResponseError): string {
  if (!payload) {
    throw new Error('expected error message to be provided');
  }
  if (typeof payload === 'string') return payload;
  if (isOpaqueErrorBody(payload)) {
    throw new Error(`can't resolve error message from stream or buffer`);
  }
  if (isElasticsearchResponseError(payload)) {
    return `[${payload.message}]: ${
      (payload.meta.body as ElasticsearchErrorDetails)?.error?.reason
    }`;
  }
  if (payload instanceof Error) return payload.message;
  if ('message' in payload) return getErrorMessage(payload.message);
  throw new Error('expected error message to be provided');
}

function getErrorAttributes(payload?: ResponseError): ResponseErrorAttributes | undefined {
  return typeof payload === 'object' && payload !== null && 'attributes' in payload
    ? payload.attributes
    : undefined;
}
