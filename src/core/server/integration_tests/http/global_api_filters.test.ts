/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { createHttpService } from '@kbn/core-http-server-mocks';
import type { HttpService } from '@kbn/core-http-server-internal';
import { contextServiceMock, executionContextServiceMock } from '../../mocks';
import { schema } from '@kbn/config-schema';
import { AuthzDisabled } from '@kbn/core-security-server';
import { Server } from '@hapi/hapi';
import { Readable } from 'stream';

describe('Global HTTP API options', () => {
  let httpService: HttpService;
  let server: Server;
  beforeEach(async () => {
    httpService = createHttpService();
    await httpService.preboot({
      context: contextServiceMock.createPrebootContract(),
    });
    const { server: innerServer, createRouter } = await httpService.setup({
      context: contextServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });
    const router = createRouter('', Symbol('fooPlugin'));
    router.post(
      {
        path: '/echo',
        validate: { body: schema.any() },
        security: { authz: AuthzDisabled.fromReason('foo test') },
      },
      async (ctx, req, res) => {
        return res.ok({ body: req.body });
      }
    );
    router.post(
      {
        path: '/stream',
        validate: false,
        security: { authz: AuthzDisabled.fromReason('foo test') },
      },
      async (ctx, req, res) => {
        return res.ok({ body: Readable.from(['test'], { objectMode: false }) });
      }
    );
    router.post(
      {
        path: '/string',
        validate: false,
        security: { authz: AuthzDisabled.fromReason('foo test') },
      },
      async (ctx, req, res) => {
        return res.ok({ body: 'test' });
      }
    );
    await httpService.start();
    server = innerServer;
  });
  afterEach(async () => {
    await httpService?.stop();
  });

  it('filters plain objects', async () => {
    const { body: result } = await supertest(server.listener)
      .post('/echo')
      .query({ filter_path: ['foo', 'bar.baz'] })
      .expect(200)
      .send({ foo: true, bar: { baz: 1 }, doNotReturn: 1 });
    expect(result).toEqual({ foo: true, bar: { baz: 1 } });
  });

  it('filters plain objects, using comma separated string inputs', async () => {
    const { body: result2 } = await supertest(server.listener)
      .post('/echo')
      .query({ filter_path: 'foo,bar.baz' })
      .expect(200)
      .send({ foo: true, bar: { baz: 1 }, doNotReturn: 1 });
    expect(result2).toEqual({ foo: true, bar: { baz: 1 } });
  });

  it('filters plain objects, excluding elements from arrays that do not match', async () => {
    const { body: result3 } = await supertest(server.listener)
      .post('/echo')
      .query({ filter_path: 'foo,bar.baz' })
      .expect(200)
      .send({
        foo: true,
        bar: [{ baz: 1 }, { baz: 2 }, { zab: 0 /* Will also be ignored */ }],
        doNotReturn: 1,
      });
    expect(result3).toEqual({ foo: true, bar: [{ baz: 1 }, { baz: 2 }] });
  });

  it('filters plain arrays', async () => {
    const { body: result4 } = await supertest(server.listener)
      .post('/echo')
      .query({ filter_path: ['test.foo'] })
      .expect(200)
      .send([{ test: 1 }, { test: 2 }, { test: { foo: 1 } }]);
    expect(result4).toEqual([{ test: { foo: 1 } }]);
  });

  it('ignores non plain object responses', async () => {
    const { body: result } = await supertest(server.listener)
      .post('/stream')
      .query({ filter_path: ['foo', 'bar.baz'] }) // essentially ignored
      .expect(200)
      .accept('*/*')
      .buffer();
    expect(result.toString('utf-8')).toBe('test');
    const { text: result2 } = await supertest(server.listener)
      .post('/string')
      .query({ filter_path: ['foo', 'bar.baz'] }) // essentially ignored
      .expect(200)
      .send();
    expect(result2).toBe('test');
  });
});
