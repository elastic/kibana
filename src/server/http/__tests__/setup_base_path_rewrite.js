import { Server } from 'hapi';
import expect from 'expect.js';
import sinon from 'sinon';

import { setupBasePathRewrite } from '../setup_base_path_rewrite';

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
    before(() => server = createServer({ basePath: '', rewriteBasePath: false }));
    after(() => server = undefined);

    it('/bar => 404', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/ => /', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/');
    });

    it('/foo => /foo', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/foo');
    });
  });

  describe('base path /bar, rewrite = false', () => {
    let server;
    before(() => server = createServer({ basePath: '/bar', rewriteBasePath: false }));
    after(() => server = undefined);

    it('/bar => 404', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/ => /', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/');
    });

    it('/foo => /foo', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/foo');
    });
  });

  describe('base path /bar, rewrite = true', () => {
    let server;
    before(() => server = createServer({ basePath: '/bar', rewriteBasePath: true }));
    after(() => server = undefined);

    it('/bar => /', async () => {
      const resp = await server.inject({
        url: '/bar'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/');
    });

    it('/bar/ => 404', async () => {
      const resp = await server.inject({
        url: '/bar/'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/');
    });

    it('/bar/foo => 404', async () => {
      const resp = await server.inject({
        url: '/bar/foo'
      });

      expect(resp.statusCode).to.be(200);
      expect(resp.payload).to.be('resp:/foo');
    });

    it('/ => 404', async () => {
      const resp = await server.inject({
        url: '/'
      });

      expect(resp.statusCode).to.be(404);
    });

    it('/foo => 404', async () => {
      const resp = await server.inject({
        url: '/foo'
      });

      expect(resp.statusCode).to.be(404);
    });
  });
});
