/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fastify from 'fastify';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { installFastifyCors } from './install_fastify_cors';
import type { HttpConfig } from '../http_config';

const log = loggingSystemMock.create().get('http');

const corsConfig = (overrides: Partial<HttpConfig['cors']>): HttpConfig['cors'] => ({
  enabled: true,
  allowCredentials: false,
  allowOrigin: ['https://elastic.example'],
  ...overrides,
});

describe('installFastifyCors', () => {
  it('does not register CORS when disabled', async () => {
    const fastify = Fastify({ logger: false });
    await installFastifyCors(fastify, { cors: corsConfig({ enabled: false }) } as HttpConfig, log);
    fastify.get('/', async () => ({ ok: true }));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { origin: 'https://elastic.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();

    await fastify.close();
  });

  it('reflects Origin for wildcard allowOrigin (Hapi parity)', async () => {
    const fastify = Fastify({ logger: false });
    await installFastifyCors(
      fastify,
      { cors: corsConfig({ allowOrigin: ['*'] }) } as HttpConfig,
      log
    );
    fastify.get('/', async () => ({ ok: true }));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { origin: 'https://client.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('https://client.example');

    await fastify.close();
  });

  it('allows configured origins and preflight for kbn-xsrf', async () => {
    const fastify = Fastify({ logger: false });
    await installFastifyCors(fastify, { cors: corsConfig({}) } as HttpConfig, log);
    fastify.post('/', async () => 'ok');
    await fastify.ready();

    const preflight = await fastify.inject({
      method: 'OPTIONS',
      url: '/',
      headers: {
        origin: 'https://elastic.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'kbn-xsrf, authorization',
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://elastic.example');
    expect(preflight.headers['access-control-allow-headers']).toContain('kbn-xsrf');

    const denied = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { origin: 'https://other.example' },
    });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    await fastify.close();
  });

  it('sets Access-Control-Allow-Credentials when enabled', async () => {
    const fastify = Fastify({ logger: false });
    await installFastifyCors(
      fastify,
      {
        cors: corsConfig({
          allowCredentials: true,
          allowOrigin: ['https://elastic.example'],
        }),
      } as HttpConfig,
      log
    );
    fastify.get('/', async () => ({ ok: true }));
    await fastify.ready();

    const res = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { origin: 'https://elastic.example' },
    });
    expect(res.headers['access-control-allow-credentials']).toBe('true');

    await fastify.close();
  });
});
