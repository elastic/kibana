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
import type { FastifyReply } from 'fastify';
import type { IncomingMessage } from 'http';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import {
  FastifyResponseAdapter,
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

  it('syncNodeResponseHeadersToFastifyReply preserves every Set-Cookie from the raw response', () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
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
