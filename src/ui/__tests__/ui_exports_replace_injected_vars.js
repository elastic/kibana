import { resolve } from 'path';

import { delay } from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon';
import cheerio from 'cheerio';
import { noop } from 'lodash';

import KbnServer from '../../server/kbn_server';

const getInjectedVarsFromResponse = (resp) => {
  const $ = cheerio.load(resp.payload);
  const data = $('kbn-initial-state').attr('data');
  return JSON.parse(data).vars;
};

const injectReplacer = (kbnServer, replacer) => {
  // normally the replacer would be defined in a plugin's uiExports,
  // but that requires stubbing out an entire plugin directory for
  // each test, so we fake it and jam the replacer into uiExports
  kbnServer.uiExports.injectedVarsReplacers.push(replacer);
};

describe('UiExports', function () {
  describe('#replaceInjectedVars', function () {
    this.slow(2000);
    this.timeout(10000);

    let kbnServer;
    beforeEach(async () => {
      kbnServer = new KbnServer({
        server: { port: 0 }, // pick a random open port
        logging: { silent: true }, // no logs
        optimize: { enabled: false },
        uiSettings: { enabled: false },
        plugins: {
          paths: [resolve(__dirname, './fixtures/test_app')] // inject an app so we can hit /app/{id}
        },
      });

      await kbnServer.ready();
      kbnServer.status.get('ui settings').state = 'green';
      kbnServer.server.decorate('server', 'uiSettings', () => {
        return { getDefaults: noop, getUserProvided: noop };
      });
    });

    afterEach(async () => {
      await kbnServer.close();
      kbnServer = null;
    });

    it('allows sync replacing of injected vars', async () => {
      injectReplacer(kbnServer, () => ({ a: 1 }));

      const resp = await kbnServer.inject('/app/test_app');
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({ a: 1 });
    });

    it('allows async replacing of injected vars', async () => {
      const asyncThing = () => delay(100).return('world');

      injectReplacer(kbnServer, async () => {
        return {
          hello: await asyncThing()
        };
      });

      const resp = await kbnServer.inject('/app/test_app');
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({
        hello: 'world'
      });
    });

    it('passes originalInjectedVars, request, and server to replacer', async () => {
      const stub = sinon.stub();
      injectReplacer(kbnServer, () => ({ foo: 'bar' }));
      injectReplacer(kbnServer, stub);

      await kbnServer.inject('/app/test_app');

      sinon.assert.calledOnce(stub);
      expect(stub.firstCall.args[0]).to.eql({ foo: 'bar' }); // originalInjectedVars
      expect(stub.firstCall.args[1]).to.have.property('path', '/app/test_app'); // request
      expect(stub.firstCall.args[1]).to.have.property('server', kbnServer.server); // request
      expect(stub.firstCall.args[2]).to.be(kbnServer.server);
    });

    it('calls the methods sequentially', async () => {
      injectReplacer(kbnServer, () => ({ name: '' }));
      injectReplacer(kbnServer, orig => ({ name: orig.name + 's' }));
      injectReplacer(kbnServer, orig => ({ name: orig.name + 'a' }));
      injectReplacer(kbnServer, orig => ({ name: orig.name + 'm' }));

      const resp = await kbnServer.inject('/app/test_app');
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({ name: 'sam' });
    });

    it('propogates errors thrown in replacers', async () => {
      injectReplacer(kbnServer, async () => {
        await delay(100);
        throw new Error('replacer failed');
      });

      const resp = await kbnServer.inject('/app/test_app');
      expect(resp).to.have.property('statusCode', 500);
    });

    it('starts off with the injected vars for the app merged with the default injected vars', async () => {
      const stub = sinon.stub();
      injectReplacer(kbnServer, stub);
      kbnServer.uiExports.defaultInjectedVars.from_defaults = true;

      await kbnServer.inject('/app/test_app');
      sinon.assert.calledOnce(stub);
      expect(stub.firstCall.args[0]).to.eql({ from_defaults: true, from_test_app: true });
    });
  });
});
