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
    request = async (method, path, response) => {
      sandbox.stub(Wreck, 'request', createWreckResponseStub(response));

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

  describe('response body', () => {
    describe('GET request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('GET', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('POST request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('POST', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('PUT request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('PUT', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('DELETE request', () => {
      it('returns the exact body', async () => {
        const { payload } = await request('DELETE', '/', 'foobar');
        expect(payload).to.be('foobar');
      });
    });
    describe('HEAD request', () => {
      it('returns the status code and text', async () => {
        const { payload } = await request('HEAD', '/');
        expect(payload).to.be('200 - OK');
      });
      describe('mixed casing', () => {
        it('returns the status code and text', async () => {
          const { payload } = await request('HeAd', '/');
          expect(payload).to.be('200 - OK');
        });
      });
    });
  });
});
