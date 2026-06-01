/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import Boom from '@hapi/boom';
import Fastify from 'fastify';
import type { FastifyReply } from 'fastify';
import type { IncomingMessage } from 'http';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import {
  FastifyResponseAdapter,
  finalizeReplySetCookieHeaders,
  stripCharsetFromNdjsonContentTypeHeader,
  syncNodeResponseHeadersToFastifyReply,
} from './fastify_response_adapter';

describe('FastifyResponseAdapter', () => {
  it('forwards Node IncomingMessage headers (e.g. proxied Elasticsearch gzip) before sending', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(recordedHeaders);
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const body = Object.assign(Readable.from(['{"ok":true}']), {
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'transfer-encoding': 'chunked',
      },
      statusCode: 200,
    }) as IncomingMessage;

    const adapter = new FastifyResponseAdapter();
    await adapter.handle(
      new KibanaResponse(200, body, {
        headers: {
          warning: '',
          'x-console-proxy-status-code': '200',
        },
      }),
      reply
    );

    expect(recordedHeaders.get('warning')).toBe('');
    expect(recordedHeaders.get('content-encoding')).toBe('gzip');
    expect(recordedHeaders.get('content-type')).toBe('application/json');
    expect(recordedHeaders.has('transfer-encoding')).toBe(false);
    expect(reply.send).toHaveBeenCalledWith(body);
  });

  it('sets octet-stream and content-length for Buffer bodies without an explicit content-type', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(recordedHeaders);
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const body = Buffer.alloc(1028, '.');
    const adapter = new FastifyResponseAdapter();
    await adapter.handle(
      new KibanaResponse(200, body, {
        headers: {
          'content-encoding': 'binary',
        },
      }),
      reply
    );

    expect(recordedHeaders.get('content-encoding')).toBe('binary');
    expect(recordedHeaders.get('content-length')).toBe('1028');
    expect(recordedHeaders.get('content-type')).toBe('application/octet-stream');
    expect(reply.send).toHaveBeenCalledWith(body);
  });

  it('formats customError bodies that nest a Boom on `message` (content_management wrapError)', async () => {
    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header: jest.fn(),
      hasHeader: jest.fn().mockReturnValue(false),
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const boom = Boom.badRequest('procedure failed');
    const adapter = new FastifyResponseAdapter();
    await adapter.handle(new KibanaResponse(400, { message: boom }, {}), reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'procedure failed',
      })
    );
  });

  it('adds charset=utf-8 to application/ndjson responses (saved objects export parity)', async () => {
    const fastify = Fastify();
    const adapter = new FastifyResponseAdapter();

    fastify.get('/export', async (_req, reply) => {
      await adapter.handle(
        new KibanaResponse(200, '{"rule_id":"rule-1"}\n', {
          headers: { 'Content-Type': 'application/ndjson; charset=utf-8' },
        }),
        reply
      );
    });

    const response = await fastify.inject({ method: 'GET', url: '/export' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/ndjson; charset=utf-8');
    expect(response.body).toBe('{"rule_id":"rule-1"}\n');

    await fastify.close();
  });

  it('strips only Fastify auto-added charset from ndjson (security export parity)', async () => {
    const fastify = Fastify();

    fastify.addHook('onSend', async (_req, reply, payload) => {
      stripCharsetFromNdjsonContentTypeHeader(reply);
      return payload;
    });

    fastify.get('/export', async (_req, reply) => {
      return reply
        .header('content-type', 'application/ndjson; charset=utf-8')
        .send('{"rule_id":"rule-1"}\n');
    });

    const response = await fastify.inject({ method: 'GET', url: '/export' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/ndjson');
    expect(response.body).toBe('{"rule_id":"rule-1"}\n');

    await fastify.close();
  });

  it('stripCharsetFromNdjsonContentTypeHeader removes Fastify charset suffix from ndjson', () => {
    const headers = new Map<string, string>();
    const reply = {
      getHeader: jest.fn((name: string) => headers.get(name.toLowerCase())),
      header: jest.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value);
      }),
    } as unknown as FastifyReply;

    headers.set('content-type', 'application/ndjson; charset=utf-8');
    stripCharsetFromNdjsonContentTypeHeader(reply);
    expect(headers.get('content-type')).toBe('application/ndjson');
  });

  it('appends charset=utf-8 to application/json responses (Hapi parity)', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      getHeader(name: string) {
        return recordedHeaders.get(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(recordedHeaders);
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const adapter = new FastifyResponseAdapter();
    await adapter.handle(
      new KibanaResponse(200, { ok: true }, { headers: { 'content-type': 'application/json' } }),
      reply
    );

    expect(recordedHeaders.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('appends charset=utf-8 to explicit text/csv responses (Hapi reporting parity)', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      getHeader(name: string) {
        return recordedHeaders.get(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(recordedHeaders);
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const body = Readable.from(['id,title\n1,foo']);
    const adapter = new FastifyResponseAdapter();
    await adapter.handle(
      new KibanaResponse(200, body, {
        headers: {
          'content-type': 'text/csv',
        },
      }),
      reply
    );

    expect(recordedHeaders.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(reply.send).toHaveBeenCalledWith(body);
  });

  it('passes through duck-typed readable bodies on errors (Fastify stream detection parity)', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();
    const reply = {
      request: { app: {} },
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(recordedHeaders);
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const body = { readable: true, pipe: jest.fn() };

    const adapter = new FastifyResponseAdapter();
    await adapter.handle(new KibanaResponse(501, body as any, {}), reply);

    expect(reply.code).toHaveBeenCalledWith(501);
    expect(reply.send).toHaveBeenCalledWith(body);
  });

  it('finalizeReplySetCookieHeaders keeps only the session cookie when clear and set are present', () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      getHeader: (name: string) => recordedHeaders.get(name.toLowerCase()),
      hasHeader: (name: string) => recordedHeaders.has(name.toLowerCase()),
      header(name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      removeHeader(name: string) {
        recordedHeaders.delete(name.toLowerCase());
      },
      raw: {
        headersSent: false,
        removeHeader: jest.fn(),
      },
    } as unknown as FastifyReply;

    reply.header('set-cookie', [
      'sid=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; Path=/',
      'sid=Fe26.2**session; HttpOnly; Secure; Path=/',
    ]);

    finalizeReplySetCookieHeaders(reply);

    expect(recordedHeaders.get('set-cookie')).toEqual([
      'sid=Fe26.2**session; HttpOnly; Secure; Path=/',
    ]);
    expect(reply.raw.removeHeader).toHaveBeenCalledWith('Set-Cookie');
  });

  it('finalizeReplySetCookieHeaders keeps distinct cookie names', () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      getHeader: (name: string) => recordedHeaders.get(name.toLowerCase()),
      header(name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      removeHeader(name: string) {
        recordedHeaders.delete(name.toLowerCase());
      },
      raw: {
        headersSent: false,
        removeHeader: jest.fn(),
      },
    } as unknown as FastifyReply;

    reply.header('set-cookie', ['foo=1; Path=/', 'bar=2; Path=/']);

    finalizeReplySetCookieHeaders(reply);

    expect(recordedHeaders.get('set-cookie')).toEqual(['foo=1; Path=/', 'bar=2; Path=/']);
  });

  it('finalizeReplySetCookieHeaders deduplicates identical session cookies', () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      getHeader: (name: string) => recordedHeaders.get(name.toLowerCase()),
      header(name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      removeHeader(name: string) {
        recordedHeaders.delete(name.toLowerCase());
      },
      raw: {
        headersSent: false,
        removeHeader: jest.fn(),
      },
    } as unknown as FastifyReply;

    const sessionCookie = 'sid=Fe26.2**session; HttpOnly; Secure; Path=/';
    reply.header('set-cookie', [sessionCookie, sessionCookie]);

    finalizeReplySetCookieHeaders(reply);

    expect(recordedHeaders.get('set-cookie')).toEqual([sessionCookie]);
    expect(reply.raw.removeHeader).toHaveBeenCalledWith('Set-Cookie');
  });

  it('syncNodeResponseHeadersToFastifyReply preserves every Set-Cookie from the raw response', () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      getHeader: () => undefined,
      raw: {
        getHeader: (name: string) =>
          name.toLowerCase() === 'set-cookie'
            ? ['sid=session-a; Path=/; HttpOnly', 'other=b; Path=/']
            : undefined,
      },
      header(_name: string, value: string | number | string[]) {
        recordedHeaders.set('set-cookie', value);
      },
    } as unknown as FastifyReply;

    syncNodeResponseHeadersToFastifyReply(reply);

    expect(recordedHeaders.get('set-cookie')).toEqual([
      'sid=session-a; Path=/; HttpOnly',
      'other=b; Path=/',
    ]);
  });
});
