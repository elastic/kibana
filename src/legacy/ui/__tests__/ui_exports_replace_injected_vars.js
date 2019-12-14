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

import { resolve } from 'path';

import { delay } from 'bluebird';
import expect from '@kbn/expect';
import sinon from 'sinon';
import cheerio from 'cheerio';
import { noop } from 'lodash';

import * as getUiSettingsServiceForRequestNS from '../ui_settings/ui_settings_service_for_request';
import { createRoot, getKbnServer, request } from '../../../test_utils/kbn_server';

const getInjectedVarsFromResponse = resp => {
  expect(resp.statusCode).to.be(200);
  const $ = cheerio.load(resp.text);
  const data = $('kbn-injected-metadata').attr('data');
  return JSON.parse(data).vars;
};

const injectReplacer = (kbnServer, replacer) => {
  // normally the replacer would be defined in a plugin's uiExports,
  // but that requires stubbing out an entire plugin directory for
  // each test, so we fake it and jam the replacer into uiExports
  const { injectedVarsReplacers = [] } = kbnServer.uiExports;
  kbnServer.uiExports.injectedVarsReplacers = [...injectedVarsReplacers, replacer];
};

describe('UiExports', function() {
  const sandbox = sinon.createSandbox();

  let root;
  let kbnServer;
  before(async () => {
    this.slow(2000);
    this.timeout(30000);

    root = root = createRoot({
      // inject an app so we can hit /app/{id}
      plugins: { paths: [resolve(__dirname, './fixtures/test_app')] },
    });

    await root.setup();
    await root.start();

    kbnServer = getKbnServer(root);

    // Mock out the ui settings which depends on ES
    sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest').returns({
      getDefaults: noop,
      getUserProvided: noop,
    });
  });

  after(async () => {
    await root.shutdown();
    sandbox.restore();
  });

  let originalInjectedVarsReplacers;
  beforeEach(() => {
    originalInjectedVarsReplacers = kbnServer.uiExports.injectedVarsReplacers;
  });

  afterEach(() => {
    kbnServer.uiExports.injectedVarsReplacers = originalInjectedVarsReplacers;
  });

  describe('#replaceInjectedVars', function() {
    it('allows sync replacing of injected vars', async () => {
      injectReplacer(kbnServer, () => ({ a: 1 }));

      const resp = await request.get(root, '/app/test_app').expect(200);
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({ a: 1 });
    });

    it('allows async replacing of injected vars', async () => {
      const asyncThing = () => delay(100).return('world');

      injectReplacer(kbnServer, async () => {
        return {
          hello: await asyncThing(),
        };
      });

      const resp = await request.get(root, '/app/test_app').expect(200);
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({
        hello: 'world',
      });
    });

    it('passes originalInjectedVars, request, and server to replacer', async () => {
      const stub = sinon.stub();
      injectReplacer(kbnServer, () => ({ foo: 'bar' }));
      injectReplacer(kbnServer, stub);

      await await request.get(root, '/app/test_app').expect(200);

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

      const resp = await request.get(root, '/app/test_app').expect(200);
      const injectedVars = getInjectedVarsFromResponse(resp);

      expect(injectedVars).to.eql({ name: 'sam' });
    });

    it('propagates errors thrown in replacers', async () => {
      injectReplacer(kbnServer, async () => {
        await delay(100);
        throw new Error('replacer failed');
      });

      await request.get(root, '/app/test_app').expect(500);
    });

    it('starts off with the injected vars for the app merged with the default injected vars', async () => {
      const stub = sinon.stub();
      injectReplacer(kbnServer, stub);

      await request.get(root, '/app/test_app').expect(200);

      sinon.assert.calledOnce(stub);
      const args = stub.lastCall.args[0];
      expect(args.from_defaults).to.be(true);
      expect(args.from_test_app).to.be(true);
    });
  });
});
