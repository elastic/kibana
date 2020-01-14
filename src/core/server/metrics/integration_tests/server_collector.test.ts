/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import supertest from 'supertest';
import { Server as HapiServer } from 'hapi';
import { createHttpServer } from '../../http/test_utils';
import { HttpService, IRouter } from '../../http';
import { contextServiceMock } from '../../context/context_service.mock';
import { ServerMetricsCollector } from '../collectors/server';

describe('ServerMetricsCollector', () => {
  let server: HttpService;
  let collector: ServerMetricsCollector;
  let hapiServer: HapiServer;
  let router: IRouter;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const sendGet = (path: string) => supertest(hapiServer.listener).get(path);

  beforeEach(async () => {
    server = createHttpServer();
    const contextSetup = contextServiceMock.createSetupContract();
    const httpSetup = await server.setup({ context: contextSetup });
    hapiServer = httpSetup.server;
    router = httpSetup.createRouter('/');
    collector = new ServerMetricsCollector(hapiServer);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('collect requests infos', async () => {
    router.get({ path: '/', validate: false }, async (ctx, req, res) => {
      return res.ok({ body: '' });
    });
    await server.start();

    let metrics = await collector.collect();

    expect(metrics.requests).toEqual({
      total: 0,
      disconnects: 0,
      statusCodes: {},
    });

    await sendGet('/');
    await sendGet('/');
    await sendGet('/not-found');

    metrics = await collector.collect();

    expect(metrics.requests).toEqual({
      total: 3,
      disconnects: 0,
      statusCodes: {
        '200': 2,
        '404': 1,
      },
    });
  });

  it('collect disconnects requests infos', async () => {
    const never = new Promise(resolve => undefined);

    router.get({ path: '/', validate: false }, async (ctx, req, res) => {
      return res.ok({ body: '' });
    });
    router.get({ path: '/disconnect', validate: false }, async (ctx, req, res) => {
      await never;
      return res.ok({ body: '' });
    });
    await server.start();

    await sendGet('/');
    const discoReq1 = sendGet('/disconnect').end();
    const discoReq2 = sendGet('/disconnect').end();
    await delay(20);

    let metrics = await collector.collect();
    expect(metrics.requests).toEqual(
      expect.objectContaining({
        total: 3,
        disconnects: 0,
      })
    );

    discoReq1.abort();
    await delay(20);

    metrics = await collector.collect();
    expect(metrics.requests).toEqual(
      expect.objectContaining({
        total: 3,
        disconnects: 1,
      })
    );

    discoReq2.abort();
    await delay(20);

    metrics = await collector.collect();
    expect(metrics.requests).toEqual(
      expect.objectContaining({
        total: 3,
        disconnects: 2,
      })
    );
  });

  it('collect response times', async () => {
    router.get({ path: '/no-delay', validate: false }, async (ctx, req, res) => {
      return res.ok({ body: '' });
    });
    router.get({ path: '/500-ms', validate: false }, async (ctx, req, res) => {
      await delay(500);
      return res.ok({ body: '' });
    });
    router.get({ path: '/250-ms', validate: false }, async (ctx, req, res) => {
      await delay(250);
      return res.ok({ body: '' });
    });
    await server.start();

    await Promise.all([sendGet('/no-delay'), sendGet('/250-ms')]);
    let metrics = await collector.collect();

    expect(metrics.response_times.avg_in_millis).toBeGreaterThanOrEqual(125);
    expect(metrics.response_times.max_in_millis).toBeGreaterThanOrEqual(250);

    await Promise.all([sendGet('/500-ms'), sendGet('/500-ms')]);
    metrics = await collector.collect();

    expect(metrics.response_times.avg_in_millis).toBeGreaterThanOrEqual(250);
    expect(metrics.response_times.max_in_millis).toBeGreaterThanOrEqual(500);
  });

  it('collect connection count', async () => {
    const waitSubject = new Subject();

    router.get({ path: '/', validate: false }, async (ctx, req, res) => {
      await waitSubject.pipe(take(1)).toPromise();
      return res.ok({ body: '' });
    });
    await server.start();

    let metrics = await collector.collect();
    expect(metrics.concurrent_connections).toEqual(0);

    sendGet('/').end(() => null);
    await delay(20);
    metrics = await collector.collect();
    expect(metrics.concurrent_connections).toEqual(1);

    sendGet('/').end(() => null);
    await delay(20);
    metrics = await collector.collect();
    expect(metrics.concurrent_connections).toEqual(2);

    waitSubject.next('go');
    await delay(20);
    metrics = await collector.collect();
    expect(metrics.concurrent_connections).toEqual(0);
  });
});
