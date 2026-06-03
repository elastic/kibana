/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { HTTPMethod, HTTPVersion, Instance as FmwInstance } from 'find-my-way';
import { translateHapiPathToFastify } from './translate_path';

const ALL_METHODS: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

interface HapiResponseLike {
  code(statusCode: number): HapiResponseLike;
  header(name: string, value: string | string[]): HapiResponseLike;
  type(contentType: string): HapiResponseLike;
  redirect(url: string): HapiResponseLike;
  takeover(): HapiResponseLike;
  etag(value: string): HapiResponseLike;
  /** Marker so the wrapping Fastify handler can detect this is a Hapi-style response. */
  __isHapiCompatResponse: true;
  __payload: unknown;
  __statusCode: number;
  __headers: Record<string, string | string[]>;
  __redirectUrl?: string;
}

interface HapiResponseToolkitLike {
  response(payload?: unknown): HapiResponseLike;
}

const buildHapiResponse = (payload: unknown): HapiResponseLike => {
  const r: HapiResponseLike = {
    __isHapiCompatResponse: true,
    __payload: payload,
    __statusCode: 200,
    __headers: {},
    code(this: HapiResponseLike, statusCode) {
      this.__statusCode = statusCode;
      return this;
    },
    header(this: HapiResponseLike, name, value) {
      this.__headers[name] = value;
      return this;
    },
    type(this: HapiResponseLike, contentType) {
      this.__headers['content-type'] = contentType;
      return this;
    },
    redirect(this: HapiResponseLike, url) {
      this.__redirectUrl = url;
      this.__statusCode =
        this.__statusCode < 300 || this.__statusCode >= 400 ? 302 : this.__statusCode;
      return this;
    },
    takeover(this: HapiResponseLike) {
      // No-op: Fastify is single-pipeline, the reply is taken over implicitly.
      return this;
    },
    etag(this: HapiResponseLike, value) {
      this.__headers.etag = value;
      return this;
    },
  };
  return r;
};

const hapiToolkit: HapiResponseToolkitLike = {
  response: buildHapiResponse,
};

const writeHapiResponseToReply = async (
  result: HapiResponseLike,
  reply: FastifyReply
): Promise<FastifyReply> => {
  reply.code(result.__statusCode);
  for (const [name, value] of Object.entries(result.__headers)) {
    if (value !== undefined) reply.header(name, value);
  }
  if (result.__redirectUrl) {
    return reply.redirect(result.__redirectUrl);
  }
  const payload = result.__payload;
  if (typeof payload === 'string') {
    return reply.type('text/plain; charset=utf-8').send(payload);
  }
  return reply.send(payload);
};

const isHapiCompatResponse = (value: unknown): value is HapiResponseLike =>
  typeof value === 'object' && value !== null && (value as any).__isHapiCompatResponse === true;

interface HapiRouteConfig {
  path: string;
  method: string | string[];
  handler:
    | ((req: any, toolkit: HapiResponseToolkitLike) => unknown | Promise<unknown>)
    | { directory: { path: string; listing?: boolean; lookupCompressed?: boolean } };
  options?: Record<string, unknown>;
}

interface HapiCompatServerOptions {
  /**
   * Invoked when a `method: '*'` route is registered against a pure catch-all path.
   * In Hapi, those act as fallbacks: more specific routes win and the wildcard is only
   * consulted when nothing else matches. find-my-way rejects two routes with the same
   * `method + url` pair, so we record these via the fallback callback and let the
   * dispatcher consult them only when `find()` returns null.
   */
  registerFallback: (
    handler: (
      req: FastifyRequest,
      reply: FastifyReply,
      params: Record<string, string | undefined>
    ) => unknown | Promise<unknown>
  ) => void;
}

const isCatchAllPath = (path: string) =>
  path === '/{p*}' || path === '/*' || /\/\{[^}]*\*\}$/.test(path) || path === '/{path*}';

/**
 * Translates a Hapi-shaped `{ path, method, handler, options }` route call into entries
 * in the find-my-way table that backs the Fastify HTTP server. Used to keep the small
 * set of "raw" `setup.server.route(...)` call-sites in {@link HttpService} (preboot 503
 * catch-all, OAS API) working unchanged when the Fastify backend is selected via
 * `server.experimental.framework: 'fastify'`.
 *
 * @internal
 */
export class HapiCompatServer {
  constructor(
    private readonly fmw: FmwInstance<HTTPVersion.V1>,
    private readonly options: HapiCompatServerOptions
  ) {}

  /**
   * Subset of Hapi's `server.route()` API that {@link HttpService}'s preboot 503 fallback
   * and `/api/oas` registration rely on:
   * - `method: '*'` is fanned out to all HTTP verbs.
   * - `path: '/{p*}'` (Hapi catch-all) is translated to find-my-way wildcard syntax.
   * - The handler receives a fake Hapi `responseToolkit` and may return a chainable
   *   response object built via `toolkit.response(payload).code(n).header(...)`.
   * - `handler: { directory: ... }` (Hapi `@hapi/inert`) is intentionally not implemented
   *   here - call `setup.registerStaticDir(...)` instead.
   */
  public route(config: HapiRouteConfig): void {
    if (typeof config.handler !== 'function') {
      throw new Error(
        `[Fastify backend] Hapi-style 'directory' route handlers are not supported via server.route(). Use setup.registerStaticDir() instead. Path: ${config.path}`
      );
    }

    const handler = config.handler;
    const wrapped = async (
      req: FastifyRequest,
      reply: FastifyReply,
      _params: Record<string, string | undefined>
    ) => {
      const result = await handler(req, hapiToolkit);
      if (isHapiCompatResponse(result)) {
        return writeHapiResponseToReply(result, reply);
      }
      return result;
    };

    // Hapi's `{ method: '*', path: '/{p*}' }` is the canonical "fallback" registration:
    // more specific routes (registered later by plugins) win, and the wildcard only
    // fires when nothing else matched. find-my-way doesn't allow two routes with the
    // same method+url pair, so persist the wildcard as a fallback handler instead of
    // registering it normally.
    if (config.method === '*' && isCatchAllPath(config.path)) {
      this.options.registerFallback(wrapped);
      return;
    }

    const url = translateHapiPathToFastify(config.path);
    const methods = this.translateMethods(config.method);
    this.fmw.on(methods, url, wrapped as unknown as any);
  }

  private translateMethods(method: string | string[]): HTTPMethod | HTTPMethod[] {
    if (method === '*') return ALL_METHODS;
    if (Array.isArray(method)) {
      return method.map((m) => m.toUpperCase() as HTTPMethod);
    }
    return method.toUpperCase() as HTTPMethod;
  }
}
