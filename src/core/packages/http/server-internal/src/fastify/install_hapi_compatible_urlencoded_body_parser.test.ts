/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fastify from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';
import { installHapiCompatibleUrlEncodedBodyParser } from './install_hapi_compatible_urlencoded_body_parser';

describe('installHapiCompatibleUrlEncodedBodyParser', () => {
  it('parses urlencoded bodies into objects on POST', async () => {
    const fastify = Fastify({ logger: false });
    installHapiCompatibleUrlEncodedBodyParser(fastify);

    fastify.post('/form', (req, reply) => {
      reply.send(req.body);
    });

    await fastify.ready();

    const response = await fastify.inject({
      method: 'POST',
      url: '/form',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'SAMLResponse=abc&RelayState=%2Fhome',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      SAMLResponse: 'abc',
      RelayState: '/home',
    });

    await fastify.close();
  });

  it('returns raw buffer when route has parse: false', async () => {
    const fastify = Fastify({ logger: false });
    installHapiCompatibleUrlEncodedBodyParser(fastify);

    fastify.addHook('onRequest', (req, _reply, done) => {
      (req as { app?: { matchedRoute?: RouterRoute } }).app = {
        matchedRoute: {
          options: { body: { parse: false, output: 'data' } },
        } as RouterRoute,
      };
      done();
    });

    fastify.post('/raw', (req, reply) => {
      reply.send({ length: (req.body as Buffer).length });
    });

    await fastify.ready();

    const payload = 'key=value';
    const response = await fastify.inject({
      method: 'POST',
      url: '/raw',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ length: payload.length });

    await fastify.close();
  });
});
