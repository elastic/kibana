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

import { Server } from 'hapi';
import sinon from 'sinon';

import { setupBasePathRewrite } from './setup_base_path_rewrite';

describe('server / setup_base_path_rewrite', () => {
  function createServer({ basePath, rewriteBasePath }) {
    const config = {
      get: sinon.stub()
    };

    config.get.withArgs('server.basePath')
      .returns(basePath);
    config.get.withArgs('server.rewriteBasePath')
      .returns(rewriteBasePath);

    const server = new Server();
    server.connection({ port: 0 });
    setupBasePathRewrite(server, config);

    server.route({
      method: 'GET',
      path: '/',
      handler(req, reply) {
        reply('resp:/');
      }
    });

    server.route({
      method: 'GET',
      path: '/foo',
      handler(req, reply) {
        reply('resp:/foo');
      }
    });

    return server;
  }

  describe('no base path', () => {
    let server;
    beforeAll(() => server = createServer({ basePath: '', rewriteBasePath: false }));
    afterAll(() => server = undefined);

    it('/bar => 404', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/ => /', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/');
    });

    it('/foo => /foo', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/foo');
    });
  });

  describe('base path /bar, rewrite = false', () => {
    let server;
    beforeAll(() => server = createServer({ basePath: '/bar', rewriteBasePath: false }));
    afterAll(() => server = undefined);

    it('/bar => 404', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/ => /', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/');
    });

    it('/foo => /foo', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/foo');
    });
  });

  describe('base path /bar, rewrite = true', () => {
    let server;
    beforeAll(() => server = createServer({ basePath: '/bar', rewriteBasePath: true }));
    afterAll(() => server = undefined);

    it('/bar => /', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/');
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/');
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).toBe(200);
      expect(resp.payload).toBe('resp:/foo');
    });

    it('/ => 404', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).toBe(404);
    });

    it('/foo => 404', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).toBe(404);
    });
  });
});
