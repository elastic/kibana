/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import type { FastifyReply } from 'fastify';
import type { IncomingMessage } from 'http';
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import { FastifyResponseAdapter } from './fastify_response_adapter';

describe('FastifyResponseAdapter', () => {
  it('forwards Node IncomingMessage headers (e.g. proxied Elasticsearch gzip) before sending', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();

    const reply = {
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
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

  it('passes through duck-typed readable bodies on errors (Fastify stream detection parity)', async () => {
    const recordedHeaders = new Map<string, string | number | string[]>();
    const reply = {
      code: jest.fn().mockReturnThis(),
      header(this: void, name: string, value: string | number | string[]) {
        recordedHeaders.set(name.toLowerCase(), value);
      },
      hasHeader(name: string) {
        return recordedHeaders.has(name.toLowerCase());
      },
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const body = { readable: true, pipe: jest.fn() };

    const adapter = new FastifyResponseAdapter();
    await adapter.handle(new KibanaResponse(501, body as any, {}), reply);

    expect(reply.code).toHaveBeenCalledWith(501);
    expect(reply.send).toHaveBeenCalledWith(body);
  });
});
