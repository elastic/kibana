/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  registerBootstrapRouteMock,
  bootstrapRendererMock,
  getSettingValueMock,
  getStylesheetPathsMock,
} from './rendering_service.test.mocks';

import { load } from 'cheerio';

import { httpServerMock } from '../http/http_server.mocks';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { mockRenderingServiceParams, mockRenderingSetupDeps } from './__mocks__/params';
import { InternalRenderingServiceSetup } from './types';
import { RenderingService } from './rendering_service';

const INJECTED_METADATA = {
  version: expect.any(String),
  branch: expect.any(String),
  buildNumber: expect.any(Number),
  env: {
    mode: {
      name: expect.any(String),
      dev: expect.any(Boolean),
      prod: expect.any(Boolean),
    },
    packageInfo: {
      branch: expect.any(String),
      buildNum: expect.any(Number),
      buildSha: expect.any(String),
      dist: expect.any(Boolean),
      version: expect.any(String),
    },
  },
};

const { createKibanaRequest, createRawRequest } = httpServerMock;

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenderingService(mockRenderingServiceParams);

    getSettingValueMock.mockImplementation((settingName: string) => settingName);
    getStylesheetPathsMock.mockReturnValue(['/style-1.css', '/style-2.css']);
  });

  describe('setup()', () => {
    it('calls `registerBootstrapRoute` with the correct parameters', async () => {
      await service.setup(mockRenderingSetupDeps);

      expect(registerBootstrapRouteMock).toHaveBeenCalledTimes(1);
      expect(registerBootstrapRouteMock).toHaveBeenCalledWith({
        router: expect.any(Object),
        renderer: bootstrapRendererMock,
      });
    });

    describe('render()', () => {
      let uiSettings: ReturnType<typeof uiSettingsServiceMock.createClient>;
      let render: InternalRenderingServiceSetup['render'];

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
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" page for blank basepath', async () => {
        mockRenderingSetupDeps.http.basePath.get.mockReturnValueOnce('');

        const content = await render(createKibanaRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" page driven by settings', async () => {
        uiSettings.getUserProvided.mockResolvedValue({ 'theme:darkMode': { userValue: true } });
        const content = await render(createKibanaRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" with excluded user settings', async () => {
        const content = await render(createKibanaRequest(), uiSettings, {
          includeUserSettings: false,
        });
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('renders "core" from legacy request', async () => {
        const content = await render(createRawRequest(), uiSettings);
        const dom = load(content);
        const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

        expect(data).toMatchSnapshot(INJECTED_METADATA);
      });

      it('calls `getStylesheetPaths` with the correct parameters', async () => {
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return true;
          }
          if (settingName === 'theme:version') {
            return 'v8';
          }
          return settingName;
        });

        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledTimes(1);
        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: true,
          themeVersion: 'v8',
          basePath: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });
    });
  });
});
