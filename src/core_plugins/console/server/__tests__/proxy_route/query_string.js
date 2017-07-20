import sinon from 'sinon';
import Wreck from 'wreck';
import expect from 'expect.js';
import { Server } from 'hapi';

import { createProxyRoute } from '../../';

import { createWreckResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns = [];
  let request;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());

    sandbox.stub(Wreck, 'request', createWreckResponseStub());

    request = async (method, path) => {
      const server = new Server();

      server.connection({ port: 0 });
      server.route(createProxyRoute({
        baseUrl: 'http://localhost:9200'
      }));

      teardowns.push(() => server.stop());

      const params = [];
      if (path != null) params.push(`path=${path}`);
      if (method != null) params.push(`method=${method}`);
      return await server.inject({
        method: 'POST',
        url: `/api/console/proxy${params.length ? `?${params.join('&')}` : ''}`,
      });
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('query string', () => {
    describe('path', () => {
      describe('contains full url', () => {
        it('treats the url as a path', async () => {
          await request('GET', 'http://evil.com/test');
          sinon.assert.calledOnce(Wreck.request);
          const args = Wreck.request.getCall(0).args;
          expect(args[1]).to.be('http://localhost:9200/http://evil.com/test');
        });
      });
      describe('is missing', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('GET', undefined);
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is empty', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('GET', '');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('starts with a slash', () => {
        it('combines well with the base url', async () => {
          await request('GET', '/index/type/id');
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[1]).to.be('http://localhost:9200/index/type/id');
        });
      });
      describe(`doesn't start with a slash`, () => {
        it('combines well with the base url', async () => {
          await request('GET', 'index/type/id');
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[1]).to.be('http://localhost:9200/index/type/id');
        });
      });
    });
    describe('method', () => {
      describe('is missing', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request(null, '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is empty', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('', '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is an invalid http method', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('foo', '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is mixed case', () => {
        it('sends a request with the exact method', async () => {
          const { statusCode } = await request('HeAd', '/');
          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[0]).to.be('HeAd');
        });
      });
    });
  });
});
