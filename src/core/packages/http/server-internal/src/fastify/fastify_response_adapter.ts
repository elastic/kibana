/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage } from 'http';
import * as stream from 'stream';
import typeDetect from 'type-detect';
import type { FastifyReply } from 'fastify';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { isResponseError as isElasticsearchResponseError } from '@kbn/es-errors';
import type { ResponseError, ResponseErrorAttributes } from '@kbn/core-http-server';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';

/** Mirrors `getServerOptions` default `routes.cache` for Hapi (`@kbn/server-http-tools`). */
const HAPI_DEFAULT_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate';

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
function applyIncomingMessageHeaders(reply: FastifyReply, incoming: IncomingMessage): void {
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value === undefined) continue;
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADER_NAMES.has(lower)) continue;
    if (reply.hasHeader(name)) continue;
    reply.header(name, value);
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
    return this.toFastifyReply(kibanaResponse, reply);
  }

  private toFastifyReply(kibanaResponse: KibanaResponse, reply: FastifyReply): FastifyReply {
    if (kibanaResponse.options.bypassErrorFormat) {
      return this.toSuccess(kibanaResponse, reply);
    }
    // Error responses whose body is already wire-format bytes/streams must not be wrapped in the
    // Kibana JSON error envelope. Delegate to `toSuccess` so Fastify applies the same `Reply#send`
    // stream detection as successful responses (see `HapiResponseAdapter.toError` opaque branch).
    if (statusHelpers.isError(kibanaResponse.status) && isOpaqueErrorBody(kibanaResponse.payload)) {
      return this.toSuccess(kibanaResponse, reply);
    }
    if (statusHelpers.isError(kibanaResponse.status)) {
      return this.toError(kibanaResponse, reply);
    }
    if (
      statusHelpers.isSuccess(kibanaResponse.status) ||
      statusHelpers.isNotModified(kibanaResponse.status)
    ) {
      return this.toSuccess(kibanaResponse, reply);
    }
    if (statusHelpers.isRedirect(kibanaResponse.status)) {
      return this.toRedirect(kibanaResponse, reply);
    }
    throw new Error(
      `Unexpected Http status code. Expected from 100 to 599, but given: ${kibanaResponse.status}.`
    );
  }

  private applyHeaders(reply: FastifyReply, headers?: Record<string, string | string[]>) {
    if (!headers) return;
    for (const [name, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      reply.header(name, value);
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

  private toSuccess(kibanaResponse: KibanaResponse, reply: FastifyReply): FastifyReply {
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
    this.applyDefaultCacheControl(reply, kibanaResponse);
    return reply.send(payload);
  }

  private toRedirect(kibanaResponse: KibanaResponse, reply: FastifyReply): FastifyReply {
    const { headers } = kibanaResponse.options;
    const location = headers && typeof headers.location === 'string' ? headers.location : undefined;
    if (!location) {
      throw new Error("expected 'location' header to be set");
    }
    this.applyHeaders(reply, kibanaResponse.options.headers);
    this.applyDefaultCacheControl(reply, kibanaResponse);
    return reply.code(kibanaResponse.status).redirect(location);
  }

  private toError(
    kibanaResponse: KibanaResponse<ResponseError>,
    reply: FastifyReply
  ): FastifyReply {
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
  const labels: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return labels[statusCode] ?? 'Error';
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
