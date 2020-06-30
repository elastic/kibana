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

import { savedObjectsClientMock } from '../../../../core/server/mocks';
import * as uiSettingsServiceFactoryNS from '../ui_settings_service_factory';
import * as getUiSettingsServiceForRequestNS from '../ui_settings_service_for_request';
// @ts-ignore
import { uiSettingsMixin } from '../ui_settings_mixin';

interface Decorators {
  server: { [name: string]: any };
  request: { [name: string]: any };
}

const uiSettingDefaults = {
  application: {
    defaultProperty1: 'value1',
  },
};

describe('uiSettingsMixin()', () => {
  const sandbox = sinon.createSandbox();

  function setup() {
    // maps of decorations passed to `server.decorate()`
    const decorations: Decorators = {
      server: {},
      request: {},
    };

    // mock hapi server
    const server = {
      log: sinon.stub(),
      route: sinon.stub(),
      addMemoizedFactoryToRequest(name: string, factory: (...args: any[]) => any) {
        this.decorate('request', name, function (this: typeof server) {
          return factory(this);
        });
      },
      decorate: sinon.spy((type: keyof Decorators, name: string, value: any) => {
        decorations[type][name] = value;
      }),
      newPlatform: {
        setup: {
          core: {
            uiSettings: {
              register: sinon.stub(),
            },
          },
        },
      },
    };

    // "promise" returned from kbnServer.ready()
    const readyPromise = {
      then: sinon.stub(),
    };

    const kbnServer = {
      server,
      uiExports: { uiSettingDefaults },
      ready: sinon.stub().returns(readyPromise),
    };

    uiSettingsMixin(kbnServer, server);

    return {
      kbnServer,
      server,
      decorations,
      readyPromise,
    };
  }

  afterEach(() => sandbox.restore());

  it('passes uiSettingsDefaults to the new platform', () => {
    const { server } = setup();
    sinon.assert.calledOnce(server.newPlatform.setup.core.uiSettings.register);
    sinon.assert.calledWithExactly(
      server.newPlatform.setup.core.uiSettings.register,
      uiSettingDefaults
    );
  });

  describe('server.uiSettingsServiceFactory()', () => {
    it('decorates server with "uiSettingsServiceFactory"', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      const uiSettingsServiceFactoryStub = sandbox.stub(
        uiSettingsServiceFactoryNS,
        'uiSettingsServiceFactory'
      );
      sinon.assert.notCalled(uiSettingsServiceFactoryStub);
      decorations.server.uiSettingsServiceFactory();
      sinon.assert.calledOnce(uiSettingsServiceFactoryStub);
    });

    it('passes `server` and `options` argument to factory', () => {
      const { decorations, server } = setup();
      expect(decorations.server).to.have.property('uiSettingsServiceFactory').a('function');

      const uiSettingsServiceFactoryStub = sandbox.stub(
        uiSettingsServiceFactoryNS,
        'uiSettingsServiceFactory'
      );

      sinon.assert.notCalled(uiSettingsServiceFactoryStub);

      const savedObjectsClient = savedObjectsClientMock.create();
      decorations.server.uiSettingsServiceFactory({
        savedObjectsClient,
      });
      sinon.assert.calledOnce(uiSettingsServiceFactoryStub);
      sinon.assert.calledWithExactly(uiSettingsServiceFactoryStub, server as any, {
        savedObjectsClient,
      });
    });
  });

  describe('request.getUiSettingsService()', () => {
    it('exposes "getUiSettingsService" on requests', () => {
      const { decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      const getUiSettingsServiceForRequestStub = sandbox.stub(
        getUiSettingsServiceForRequestNS,
        'getUiSettingsServiceForRequest'
      );
      sinon.assert.notCalled(getUiSettingsServiceForRequestStub);
      decorations.request.getUiSettingsService();
      sinon.assert.calledOnce(getUiSettingsServiceForRequestStub);
    });

    it('passes request to getUiSettingsServiceForRequest', () => {
      const { server, decorations } = setup();
      expect(decorations.request).to.have.property('getUiSettingsService').a('function');

      const getUiSettingsServiceForRequestStub = sandbox.stub(
        getUiSettingsServiceForRequestNS,
        'getUiSettingsServiceForRequest'
      );
      sinon.assert.notCalled(getUiSettingsServiceForRequestStub);
      const request = {};
      decorations.request.getUiSettingsService.call(request);
      sinon.assert.calledWith(getUiSettingsServiceForRequestStub, server as any, request as any);
    });
  });

  describe('server.uiSettings()', () => {
    it('throws an error, links to pr', () => {
      const { decorations } = setup();
      expect(decorations.server).to.have.property('uiSettings').a('function');
      expect(() => {
        decorations.server.uiSettings();
      }).to.throwError('http://github.com' as any); // incorrect typings
    });
  });
});
