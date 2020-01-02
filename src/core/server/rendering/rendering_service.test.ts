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

import { load } from 'cheerio';

import { httpServerMock } from '../http/http_server.mocks';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { mockRenderingServiceParams, mockRenderingSetupDeps } from './__mocks__/params';
import { RenderingServiceSetup } from './types';
import { RenderingService } from './rendering_service';

const INJECTED_METADATA = {
  version: expect.any(String),
  branch: expect.any(String),
  buildNumber: expect.any(Number),
  env: {
    binDir: expect.any(String),
    configDir: expect.any(String),
    homeDir: expect.any(String),
    logDir: expect.any(String),
    packageInfo: {
      branch: expect.any(String),
      buildNum: expect.any(Number),
      buildSha: expect.any(String),
      version: expect.any(String),
    },
    pluginSearchPaths: expect.any(Array),
    staticFilesDir: expect.any(String),
  },
  legacyMetadata: {
    branch: expect.any(String),
    buildNum: expect.any(Number),
    buildSha: expect.any(String),
    version: expect.any(String),
  },
};
const { createKibanaRequest, createRawRequest } = httpServerMock;
const legacyApp = { getId: () => 'legacy' };

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenderingService(mockRenderingServiceParams);
  });

  describe('setup()', () => {
    it('creates instance of RenderingServiceSetup', async () => {
      const rendering = await service.setup(mockRenderingSetupDeps);

      expect(rendering.render).toBeInstanceOf(Function);
    });

    describe('render()', () => {
      let uiSettings: ReturnType<typeof uiSettingsServiceMock.createClient>;
      let render: RenderingServiceSetup['render'];

      beforeEach(async () => {
        uiSettings = uiSettingsServiceMock.createClient();
        uiSettings.getRegistered.mockReturnValue({
          registered: { name: 'title' },
        });
        render = (await service.setup(mockRenderingSetupDeps)).render;
      });

      it('renders "core" page', async () => {
        const content = await render(createKibanaRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" page for blank basepath', async () => {
        mockRenderingSetupDeps.http.basePath.get.mockReturnValueOnce('');

        const content = await render(createKibanaRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" page driven by settings', async () => {
        uiSettings.getUserProvided.mockResolvedValue({ 'theme:darkMode': { userValue: true } });
        const content = await render(createKibanaRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" with excluded user settings', async () => {
        const content = await render(createKibanaRequest(), uiSettings, {
          includeUserSettings: false,
        });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" from legacy request', async () => {
        const content = await render(createRawRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "legacy" page', async () => {
        const content = await render(createRawRequest(), uiSettings, { app: legacyApp });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "legacy" page for blank basepath', async () => {
        mockRenderingSetupDeps.http.basePath.get.mockReturnValueOnce('');

        const content = await render(createRawRequest(), uiSettings, { app: legacyApp });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "legacy" with custom vars', async () => {
        const content = await render(createRawRequest(), uiSettings, {
          app: legacyApp,
          vars: {
            fake: '__TEST_TOKEN__',
          },
        });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "legacy" with excluded user settings', async () => {
        const content = await render(createRawRequest(), uiSettings, {
          app: legacyApp,
          includeUserSettings: false,
        });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "legacy" with excluded user settings and custom vars', async () => {
        const content = await render(createRawRequest(), uiSettings, {
          app: legacyApp,
          includeUserSettings: false,
          vars: {
            fake: '__TEST_TOKEN__',
          },
        });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });
    });
  });
});
