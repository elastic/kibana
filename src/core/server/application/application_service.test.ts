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

import { mockCoreContext } from '../core_context.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { pluginServiceMock } from '../plugins/plugins_service.mock';
import { legacyServiceMock } from '../legacy/legacy_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { MockApplicationContextProvider } from './application_context_provider.test.mocks';
import { ApplicationService } from './application_service';

describe('ApplicationService', () => {
  let context: ReturnType<typeof mockCoreContext.create>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let plugins: ReturnType<typeof pluginServiceMock.createSetupContract>;
  let legacy: ReturnType<typeof legacyServiceMock.createSetupContract>;
  let service: ApplicationService;

  beforeEach(() => {
    context = mockCoreContext.create();
    service = new ApplicationService(context);
    http = httpServiceMock.createSetupContract();
    legacy = legacyServiceMock.createSetupContract();
  });

  describe('getCoreContextProvider', () => {
    it('creates instance of ApplicationContextProvider', async () => {
      const { getCoreContextProvider } = await service.setup({ http, plugins, legacy });

      await expect(
        getCoreContextProvider({
          request: httpServerMock.createKibanaRequest(),
          response: httpServerMock.createResponseFactory(),
          uiSettingsClient: uiSettingsServiceMock.createClient(),
        })
      ).resolves.toBe(MockApplicationContextProvider);
    });
  });
});
