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

import sinon from 'sinon';
import expect from '@kbn/expect';

import { Config } from '../../../server/config';

/* eslint-disable import/no-duplicates */
import * as uiSettingsServiceFactoryNS from '../ui_settings_service_factory';
import { uiSettingsServiceFactory } from '../ui_settings_service_factory';
import * as getUiSettingsServiceForRequestNS from '../ui_settings_service_for_request';
import { getUiSettingsServiceForRequest } from '../ui_settings_service_for_request';
/* eslint-enable import/no-duplicates */

import { uiSettingsMixin } from '../ui_settings_mixin';

describe('uiSettingsMixin()', () => {
  const sandbox = sinon.createSandbox();

  function setup() {
    const config = Config.withDefaultSchema({
      uiSettings: {
        overrides: {
          foo: 'bar'
        }
      }
    });

    // maps of decorations passed to `server.decorate()`
    const decorations = {
      server: {},
      request: {}
    };

    // mock hapi server
    const server = {
      log: sinon.stub(),
      route: sinon.stub(),
      config: () => config,
      addMemoizedFactoryToRequest(name, factory) {
        this.decorate('request', name, function () {
          return factory(this);
        });
      },
      decorate: sinon.spy((type, name, value) => {
        decorations[type][name] = value;
      }),
    };

    // "promise" returned from kbnServer.ready()
    const readyPromise = {
      then: sinon.stub(),
    };

    const kbnServer = {
      server,
      config,
      uiExports: { addConsumer: sinon.stub() },
      ready: sinon.stub().returns(readyPromise),
    };

    uiSettingsMixin(kbnServer, server, config);

    return {
      kbnServer,
      server,
      decorations,
      readyPromise,
    };
  }

  afterEach(() => sandbox.restore());

  describe('server.uiSettingsServiceFactory()', () => {
    it('decorates server with "uiSettingsServiceFactory"', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      sandbox.stub(uiSettingsServiceFactoryNS, 'uiSettingsServiceFactory');
      sinon.assert.notCalled(uiSettingsServiceFactory);
      decorations.server.uiSettingsServiceFactory();
      sinon.assert.calledOnce(uiSettingsServiceFactory);
    });

    it('passes `server` and `options` argument to factory', () => {
      const { decorations, server } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      sandbox.stub(uiSettingsServiceFactoryNS, 'uiSettingsServiceFactory');
      sinon.assert.notCalled(uiSettingsServiceFactory);
      decorations.server.uiSettingsServiceFactory({
        foo: 'bar'
      });
      sinon.assert.calledOnce(uiSettingsServiceFactory);
      sinon.assert.calledWithExactly(uiSettingsServiceFactory, server, {
        foo: 'bar',
        overrides: {
          foo: 'bar'
        },
        getDefaults: sinon.match.func,
      });
    });
  });

  describe('request.getUiSettingsService()', () => {
    it('exposes "getUiSettingsService" on requests', () => {
      const { decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest');
      sinon.assert.notCalled(getUiSettingsServiceForRequest);
      decorations.request.getUiSettingsService();
      sinon.assert.calledOnce(getUiSettingsServiceForRequest);
    });

    it('passes request to getUiSettingsServiceForRequest', () => {
      const { server, decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      sandbox.stub(getUiSettingsServiceForRequestNS, 'getUiSettingsServiceForRequest');
      sinon.assert.notCalled(getUiSettingsServiceForRequest);
      const request = {};
      decorations.request.getUiSettingsService.call(request);
      sinon.assert.calledWith(getUiSettingsServiceForRequest, server, request);
    });
  });

  describe('server.uiSettings()', () => {
    it('throws an error, links to pr', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettings').a('function');
      expect(() => {
        decorations.server.uiSettings();
      }).to.throwError('http://github.com');
    });
  });
});
