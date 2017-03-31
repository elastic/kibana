import { request } from 'http';

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
      server.route(createProxyRoute({
        baseUrl: 'http://localhost:9200'
      }));

      teardowns.push(() => server.stop());

      return { server };
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('headers', function () {
    this.timeout(Infinity);

    it('forwards the remote header info', async () => {
      const { server } = setup();
      await server.start();

      const resp = await new Promise(resolve => {
        request({
          protocol: server.info.protocol + ':',
          host: server.info.address,
          port: server.info.port,
          method: 'POST',
          path: '/api/console/proxy?method=GET&path=/'
        }, resolve).end();
      });

      resp.destroy();

      sinon.assert.calledOnce(Wreck.request);
      const { headers } = Wreck.request.getCall(0).args[2];
      expect(headers).to.have.property('x-forwarded-for').and.not.be('');
      expect(headers).to.have.property('x-forwarded-port').and.not.be('');
      expect(headers).to.have.property('x-forwarded-proto').and.not.be('');
      expect(headers).to.have.property('x-forwarded-host').and.not.be('');
    });
  });
});
