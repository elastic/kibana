import { Agent } from 'http';

import sinon from 'sinon';
import Wreck from 'wreck';
import expect from 'expect.js';
import { Server } from 'hapi';

import { createProxyRoute } from '../../';

import { createWreckResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns = [];
  let setup;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());

    sandbox.stub(Wreck, 'request', createWreckResponseStub());

    setup = () => {
      const server = new Server();
      server.connection({ port: 0 });
      teardowns.push(() => server.stop());
      return { server };
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('params', () => {
    describe('pathFilters', () => {
      describe('no matches', () => {
        it('rejects with 403', async () => {
          const { server } = setup();
          server.route(createProxyRoute({
            pathFilters: [
              /^\/foo\//,
              /^\/bar\//,
            ]
          }));

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/baz/type/id',
          });

          expect(statusCode).to.be(403);
        });
      });
      describe('one match', () => {
        it('allows the request', async () => {
          const { server } = setup();
          server.route(createProxyRoute({
            pathFilters: [
              /^\/foo\//,
              /^\/bar\//,
            ]
          }));

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/foo/type/id',
          });

          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(Wreck.request);
        });
      });
      describe('all match', () => {
        it('allows the request', async () => {
          const { server } = setup();
          server.route(createProxyRoute({
            pathFilters: [
              /^\/foo\//,
              /^\/bar\//,
            ]
          }));

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/foo/type/id',
          });

          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(Wreck.request);
        });
      });
    });

    describe('getConfigForReq()', () => {
      it('passes the request and targeted uri', async () => {
        const { server } = setup();

        const getConfigForReq = sinon.stub().returns({});

        server.route(createProxyRoute({ getConfigForReq }));
        await server.inject({
          method: 'POST',
          url: '/api/console/proxy?method=HEAD&path=/index/type/id',
        });

        sinon.assert.calledOnce(getConfigForReq);
        const args = getConfigForReq.getCall(0).args;
        expect(args[0]).to.have.property('path', '/api/console/proxy');
        expect(args[0]).to.have.property('method', 'post');
        expect(args[0]).to.have.property('query').eql({ method: 'HEAD', path: '/index/type/id' });
        expect(args[1]).to.be('/index/type/id');
      });

      it('sends the returned timeout, rejectUnauthorized, agent, and base headers to Wreck', async () => {
        const { server } = setup();

        const timeout = Math.round(Math.random() * 10000);
        const agent = new Agent();
        const rejectUnauthorized = !!Math.round(Math.random());
        const headers = {
          foo: 'bar',
          baz: 'bop'
        };

        server.route(createProxyRoute({
          getConfigForReq: () => ({
            timeout,
            agent,
            rejectUnauthorized,
            headers
          })
        }));

        await server.inject({
          method: 'POST',
          url: '/api/console/proxy?method=HEAD&path=/index/type/id',
        });

        sinon.assert.calledOnce(Wreck.request);
        const opts = Wreck.request.getCall(0).args[2];
        expect(opts).to.have.property('timeout', timeout);
        expect(opts).to.have.property('agent', agent);
        expect(opts).to.have.property('rejectUnauthorized', rejectUnauthorized);
        expect(opts.headers).to.have.property('foo', 'bar');
        expect(opts.headers).to.have.property('baz', 'bop');
      });
    });

    describe('baseUrl', () => {
      describe('default', () => {
        it('ensures that the path starts with a /');
      });
      describe('url ends with a slash', () => {
        it('combines clean with paths that start with a slash');
        it(`combines clean with paths that don't start with a slash`);
      });
      describe(`url doesn't end with a slash`, () => {
        it('combines clean with paths that start with a slash');
        it(`combines clean with paths that don't start with a slash`);
      });
    });
  });
});
