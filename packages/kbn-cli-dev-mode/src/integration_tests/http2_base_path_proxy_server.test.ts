/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { Server } from '@hapi/hapi';
import { EMPTY } from 'rxjs';
import moment from 'moment';
import supertest from 'supertest';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { getServerOptions, createServer, type IHttpConfig } from '@kbn/server-http-tools';
import { ByteSizeValue } from '@kbn/config-schema';

import { Http2BasePathProxyServer, BasePathProxyServerOptions } from '../base_path_proxy';
import { DevConfig } from '../config/dev_config';
import { TestLog } from '../log';

describe('Http2BasePathProxyServer', () => {
  let server: Server;
  let proxyServer: Http2BasePathProxyServer;
  let logger: TestLog;
  let config: IHttpConfig;
  let basePath: string;
  let proxySupertest: supertest.Agent;

  beforeAll(() => {
    // required for the self-signed certificates used in testing
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  beforeEach(async () => {
    logger = new TestLog();

    config = {
      protocol: 'http2',
      host: '127.0.0.1',
      port: 10012,
      shutdownTimeout: moment.duration(30, 'seconds'),
      keepaliveTimeout: 1000,
      socketTimeout: 1000,
      payloadTimeout: 1000,
      cors: {
        enabled: false,
        allowCredentials: false,
        allowOrigin: [],
      },
      ssl: {
        enabled: true,
        certificate: await readFileSync(KBN_CERT_PATH, 'utf-8'),
        key: await readFileSync(KBN_KEY_PATH, 'utf-8'),
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
      },
      maxPayload: new ByteSizeValue(1024),
      restrictInternalApis: false,
    };

    const serverOptions = getServerOptions(config);
    server = createServer(serverOptions);

    // setup and start the proxy server
    const proxyConfig: IHttpConfig = { ...config, port: 10013 };
    const devConfig = new DevConfig({ basePathProxyTarget: config.port });
    proxyServer = new Http2BasePathProxyServer(logger, proxyConfig, devConfig);
    const options: BasePathProxyServerOptions = {
      shouldRedirectFromOldBasePath: () => true,
      delayUntil: () => EMPTY,
    };
    await proxyServer.start(options);

    // set the base path or throw if for some unknown reason it is not setup
    if (proxyServer.basePath == null) {
      throw new Error('Invalid null base path, all tests will fail');
    } else {
      basePath = proxyServer.basePath;
    }
    proxySupertest = supertest(`https://127.0.0.1:${proxyConfig.port}`, { http2: true });
  });

  afterEach(async () => {
    await server.stop();
    await proxyServer.stop();
    jest.clearAllMocks();
  });

  test('root URL will return a 302 redirect', async () => {
    await proxySupertest.get('/').expect(302);
  });

  test('root URL will return a redirect location with exactly 3 characters that are a-z (or spalger)', async () => {
    const res = await proxySupertest.get('/');
    const location = res.header.location;
    expect(location).toMatch(/^\/(spalger|[a-z]{3})$/);
  });

  test('forwards request with the correct path', async () => {
    server.route({
      method: 'GET',
      path: `${basePath}/foo/{test}`,
      handler: (request, h) => {
        return h.response(request.params.test);
      },
    });
    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/some-string`)
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('some-string');
      });
  });

  test('can serve http/1.x requests', async () => {
    server.route({
      method: 'GET',
      path: `${basePath}/foo/{test}`,
      handler: (request, h) => {
        return h.response(request.params.test);
      },
    });
    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/some-string`)
      .http2(false)
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('some-string');
      });
  });

  test('forwards request with the correct query params', async () => {
    server.route({
      method: 'GET',
      path: `${basePath}/foo/`,
      handler: (request, h) => {
        return h.response(request.query);
      },
    });

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/?bar=test&quux=123`)
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ bar: 'test', quux: '123' });
      });
  });

  test('forwards the request body', async () => {
    server.route({
      method: 'POST',
      path: `${basePath}/foo/`,
      handler: (request, h) => {
        return h.response(request.payload);
      },
    });

    await server.start();

    await proxySupertest
      .post(`${basePath}/foo/`)
      .send({
        bar: 'test',
        baz: 123,
      })
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ bar: 'test', baz: 123 });
      });
  });

  test('returns the correct status code', async () => {
    server.route({
      method: 'GET',
      path: `${basePath}/foo/`,
      handler: (request, h) => {
        return h.response({ foo: 'bar' }).code(417);
      },
    });

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/`)
      .expect(417)
      .then((res) => {
        expect(res.body).toEqual({ foo: 'bar' });
      });
  });

  test('returns the response headers', async () => {
    server.route({
      method: 'GET',
      path: `${basePath}/foo/`,
      handler: (request, h) => {
        return h.response({ foo: 'bar' }).header('foo', 'bar');
      },
    });

    await server.start();

    await proxySupertest
      .get(`${basePath}/foo/`)
      .expect(200)
      .then((res) => {
        expect(res.get('foo')).toEqual('bar');
      });
  });

  test('forwards request cancellation', async () => {
    let propagated = false;

    let notifyRequestReceived: () => void;
    const requestReceived = new Promise<void>((resolve) => {
      notifyRequestReceived = resolve;
    });

    let notifyRequestAborted: () => void;
    const requestAborted = new Promise<void>((resolve) => {
      notifyRequestAborted = resolve;
    });

    server.route({
      method: 'GET',
      path: `${basePath}/foo/{test}`,
      handler: async (request, h) => {
        notifyRequestReceived();

        request.raw.req.once('aborted', () => {
          notifyRequestAborted();
          propagated = true;
        });
        return await new Promise((resolve) => undefined);
      },
    });
    await server.start();

    const request = proxySupertest.get(`${basePath}/foo/some-string`).end();

    await requestReceived;

    request.abort();

    await requestAborted;

    expect(propagated).toEqual(true);
  });
});
