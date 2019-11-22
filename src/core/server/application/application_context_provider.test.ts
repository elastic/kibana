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
import { ApplicationContextProvider } from './application_context_provider';

const RESPONSE_SNAPSHOT = `
  Object {
    "body": Any<String>,
    "headers": Object {
      "content-security-policy": "script-src 'unsafe-eval' 'self'; worker-src blob:; child-src blob:; style-src 'unsafe-inline' 'self'",
    },
  }
`;
const MATCHES_CORE = /app:core/;
const MATCHES_FAKE_VAR = /&quot;fake&quot;:&quot;__TEST_TOKEN__&quot;/;

describe('ApplicationContextProvider', () => {
  let context: ReturnType<typeof mockCoreContext.create>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let plugins: ReturnType<typeof pluginServiceMock.createSetupContract>;
  let legacy: ReturnType<typeof legacyServiceMock.createSetupContract>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let uiSettingsClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
  let provider: ApplicationContextProvider;

  beforeEach(async () => {
    context = mockCoreContext.create();
    http = httpServiceMock.createSetupContract();
    plugins = pluginServiceMock.createSetupContract();
    legacy = legacyServiceMock.createSetupContract();
    request = httpServerMock.createKibanaRequest();
    response = httpServerMock.createResponseFactory();
    uiSettingsClient = uiSettingsServiceMock.createClient();
    provider = new ApplicationContextProvider({
      env: context.env,
      http,
      legacy,
      plugins,
      request,
      response,
      uiSettings: await uiSettingsClient.getAll(),
    });
  });

  describe('#render()', () => {
    it('renders "core" application', async () => {
      await provider.render('core');
      expect(response.ok).toHaveBeenCalled();

      const options = response.ok.mock.calls[0][0];

      expect(options).toMatchInlineSnapshot({ body: expect.any(String) }, RESPONSE_SNAPSHOT);
      expect(options!.body).toMatch(MATCHES_CORE);
    });

    it('renders fallback to "core" application when appId not found', async () => {
      await provider.render('fake');
      expect(response.ok).toHaveBeenCalled();

      const options = response.ok.mock.calls[0][0];

      expect(options).toMatchInlineSnapshot({ body: expect.any(String) }, RESPONSE_SNAPSHOT);
      expect(options!.body).toMatch(MATCHES_CORE);
    });

    it('renders available application', async () => {
      http.server.getUiAppById = jest.fn(appId => ({ getId: () => appId }));
      await provider.render('test');
      expect(response.ok).toHaveBeenCalled();

      const options = response.ok.mock.calls[0][0];

      expect(options).toMatchInlineSnapshot({ body: expect.any(String) }, RESPONSE_SNAPSHOT);
      expect(options!.body).toMatch(/app:test/);
    });

    it('renders with custom injectedVarsOverrides', async () => {
      http.server.getUiAppById = jest.fn(appId => ({ getId: () => appId }));
      await provider.render('core', { fake: '__TEST_TOKEN__' });
      expect(response.ok).toHaveBeenCalled();

      const options = response.ok.mock.calls[0][0];

      expect(options).toMatchInlineSnapshot({ body: expect.any(String) }, RESPONSE_SNAPSHOT);
      expect(options!.body).toMatch(MATCHES_FAKE_VAR);
    });
  });
});
