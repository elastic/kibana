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
import { BehaviorSubject } from 'rxjs';

import { MockUiSettingsClientConstructor } from './ui_settings_service.test.mock';

import { UiSettingsService } from './ui_settings_service';
import { httpServiceMock } from '../http/http_service.mock';
import { savedObjectsClientMock } from '../mocks';
import { mockCoreContext } from '../core_context.mock';

const overrides = {
  overrideBaz: 'baz',
};

const defaults = {
  foo: {
    name: 'foo',
    value: 'bar',
    category: [],
    description: '',
  },
};

const coreContext = mockCoreContext.create();
coreContext.configService.atPath.mockReturnValue(new BehaviorSubject({ overrides }));
const httpSetup = httpServiceMock.createSetupContract();
const setupDeps = { http: httpSetup };
const savedObjectsClient = savedObjectsClientMock.create();

afterEach(() => {
  MockUiSettingsClientConstructor.mockClear();
});

describe('uiSettings', () => {
  describe('#setup', () => {
    describe('#asScopedToClient', () => {
      it('passes saved object type "config" to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        const setup = await service.setup(setupDeps);
        setup.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].type).toBe('config');
      });

      it('passes overrides to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        const setup = await service.setup(setupDeps);
        setup.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toBe(overrides);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toEqual(overrides);
      });

      it('passes a copy of set defaults to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        const setup = await service.setup(setupDeps);

        setup.register(defaults);
        setup.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);

        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual(defaults);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).not.toBe(defaults);
      });
    });

    describe('#register', () => {
      it('throws if registers the same key twice', async () => {
        const service = new UiSettingsService(coreContext);
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        expect(() => setup.register(defaults)).toThrowErrorMatchingInlineSnapshot(
          `"uiSettings for the key [foo] has been already registered"`
        );
      });
    });
  });

  describe('#start', () => {
    describe('#asScopedToClient', () => {
      it('passes saved object type "config" to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        await service.setup(setupDeps);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);

        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].type).toBe('config');
      });

      it('passes overrides to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        await service.setup(setupDeps);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toBe(overrides);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toEqual(overrides);
      });

      it('passes a copy of set defaults to UiSettingsClient', async () => {
        const service = new UiSettingsService(coreContext);
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);

        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual(defaults);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).not.toBe(defaults);
      });
    });
  });
});
