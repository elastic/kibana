/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import type { FastifyError } from '@fastify/error';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import type { RouterRoute } from '@kbn/core-http-server';

import { KIBANA_HAPI_COMPAT_REQUEST } from './fastify_auth';
import { KIBANA_LIFECYCLE_SHORT_CIRCUITED } from './fastify_lifecycle';
import { routeHasUnparsedPayload } from './fastify_route_body_options';

/** Matches the default `parts` limit in `@fastify/multipart` unless overridden at register time. */
const MULTIPART_MAX_PARTS = 1000;

/**
 * `@fastify/multipart` merges plugin defaults with per-`req.parts({ limits })` options.
 * Keep the plugin baseline high enough that saved-objects `_import` (often tens of MB via
 * `savedObjects.maxImportPayloadBytes`) is not capped by `server.maxPayload` (~1–2MB in tests).
 */
const MULTIPART_PLUGIN_MIN_FILE_SIZE_BYTES = 32 * 1024 * 1024;

function acceptsMultipartRoute(accepts: string | readonly string[] | undefined): boolean {
  if (accepts == null) {
    return false;
  }
  const list = Array.isArray(accepts) ? accepts : [accepts];
  return list.some((mime) => mime === 'multipart/form-data');
}

/**
 * Hapi allows `multipart/form-data` when `options.body.accepts` is unset (default mime allowlist).
 * Routes like timeline `_import` only set `output: 'stream'`; supertest `.attach()` still sends multipart.
 */
function shouldParseMultipartBody(
  accepts: string | readonly string[] | undefined,
  isMultipart: boolean
): boolean {
  if (!isMultipart) {
    return false;
  }
  if (acceptsMultipartRoute(accepts)) {
    return true;
  }
  return accepts == null;
}

function multipartRequestOptions(fileSize: number) {
  return { limits: { fileSize, parts: MULTIPART_MAX_PARTS } };
}

/**
 * Hapi `payload.parse: false` with `multipart/form-data` exposes the raw entity body
 * (lists `_import` parses boundaries in {@link BufferLines}). `@fastify/multipart` only
 * flags the request until `req.parts()` runs — read `IncomingMessage` without busboy.
 */
async function readRawRequestBody(raw: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of raw) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function isMultipartPayloadTooLarge(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as FastifyError).code === 'FST_REQ_FILE_TOO_LARGE'
  );
}

function sendPayloadTooLarge(req: FastifyRequest, reply: FastifyReply, maxBytes: number): void {
  const app = ((req as FastifyRequest & { app?: Record<symbol, boolean> }).app =
    (req as FastifyRequest & { app?: Record<symbol, boolean> }).app ?? {});
  app[KIBANA_LIFECYCLE_SHORT_CIRCUITED] = true;
  void reply.code(413).send({
    statusCode: 413,
    error: 'Request Entity Too Large',
    message: `Payload content length greater than maximum allowed: ${maxBytes}`,
  });
}

async function drainMultipartBody(
  req: FastifyRequest,
  reply: FastifyReply,
  maxFileSize: number
): Promise<void> {
  try {
    for await (const part of req.parts(multipartRequestOptions(maxFileSize))) {
      if (part.type === 'file') {
        part.file.resume();
        await finished(part.file);
      }
    }
  } catch (error) {
    if (isMultipartPayloadTooLarge(error)) {
      sendPayloadTooLarge(req, reply, maxFileSize);
      return;
    }
    // Malformed multipart or aborted request — ignore so the request cycle can finish.
  }
}

/**
 * Registers `@fastify/multipart` (adds the `multipart/form-data` content-type parser) and
 * builds a Hapi-compatible {@link FastifyRequest.body} for routes that declare
 * `options.body.accepts: 'multipart/form-data'` (saved_objects `_import`, etc.).
 *
 * Runs in `preValidation` **before** {@link registerFastifyAuthentication} so auth builds
 * the cached Hapi-compat request with the parsed payload. Drops the compat cache when we
 * mutate `req.body` so `makeRouteHandler` reconstructs `payload` from the multipart parse.
 *
 * @internal
 */
export async function registerFastifyMultipartAndKibanaBodyHook(params: {
  fastify: FastifyInstance;
  maxPayloadBytes: number;
}): Promise<void> {
  const { fastify, maxPayloadBytes } = params;

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: Math.max(maxPayloadBytes, MULTIPART_PLUGIN_MIN_FILE_SIZE_BYTES),
      parts: MULTIPART_MAX_PARTS,
    },
  });

  fastify.addHook('preValidation', async (req: FastifyRequest, reply: FastifyReply) => {
    const app = (req as FastifyRequest & { app?: Record<string | symbol, unknown> }).app;
    const route = app?.matchedRoute as RouterRoute | undefined;
    const accepts = route?.options?.body?.accepts as string | readonly string[] | undefined;
    const isMultipart = (req as FastifyRequest & { isMultipart?: () => boolean }).isMultipart?.();
    const requiresMultipartOnly =
      accepts != null &&
      (Array.isArray(accepts) ? accepts : [accepts]).every(
        (mime) => mime === 'multipart/form-data'
      );
    const parseMultipart = shouldParseMultipartBody(accepts, Boolean(isMultipart));

    // Hapi returns 415 before schema validation when a route declares multipart-only payload
    // but the client did not send multipart/form-data (saved_objects `_import`, etc.).
    if (requiresMultipartOnly && !isMultipart) {
      return reply.code(415).send({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: 'Unsupported Media Type',
      });
    }

    if (!isMultipart) {
      return;
    }

    if (!parseMultipart) {
      await drainMultipartBody(req, reply, maxPayloadBytes);
      return;
    }

    if (routeHasUnparsedPayload(route)) {
      req.body = await readRawRequestBody(req.raw);
      if (app) {
        delete app[KIBANA_HAPI_COMPAT_REQUEST];
      }
      return;
    }

    const maxBytes = route?.options?.body?.maxBytes ?? maxPayloadBytes;
    const body: Record<string, unknown> = {};

    // Busboy only advances after each file stream is fully consumed. Handing the raw `part.file`
    // to the route handler and continuing `for await` deadlocks on large bodies (nothing drains the
    // stream yet). Teeing into PassThrough also stalls when the handler has not started reading:
    // PassThrough backpressure stops the pipe before preValidation finishes. Buffer each file with
    // `toBuffer()` (respects multipart fileSize limits) then expose a small Readable — bounded by
    // `savedObjects.maxImportPayloadBytes` / route maxBytes, same as loading the upload in memory.
    try {
      for await (const part of req.parts(multipartRequestOptions(maxBytes))) {
        if (part.type === 'file') {
          const buf = await (part as { toBuffer: () => Promise<Buffer> }).toBuffer();
          const stream = Readable.from(buf);
          Object.assign(stream as { hapi?: { filename: string } }, {
            hapi: { filename: part.filename ?? 'upload.ndjson' },
          });
          body[part.fieldname] = stream;
        } else if (part.type === 'field') {
          body[part.fieldname] = part.value;
        }
      }
    } catch (error) {
      if (isMultipartPayloadTooLarge(error)) {
        sendPayloadTooLarge(req, reply, maxBytes);
        return;
      }
      throw error;
    }

    req.body = body;
    if (app) {
      delete app[KIBANA_HAPI_COMPAT_REQUEST];
    }
  });
}
