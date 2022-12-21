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
import { mockRouter } from '../http/router/router.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import {
  mockRenderingServiceParams,
  mockRenderingPrebootDeps,
  mockRenderingSetupDeps,
} from './__mocks__/params';
import { InternalRenderingServicePreboot, InternalRenderingServiceSetup } from './types';
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

const { createKibanaRequest } = httpServerMock;

function renderTestCases(
  getRender: () => Promise<
    [
      InternalRenderingServicePreboot['render'] | InternalRenderingServiceSetup['render'],
      typeof mockRenderingPrebootDeps | typeof mockRenderingSetupDeps
    ]
  >
) {
  describe('render()', () => {
    let uiSettings: ReturnType<typeof uiSettingsServiceMock.createClient>;

    beforeEach(async () => {
      uiSettings = uiSettingsServiceMock.createClient();
      uiSettings.getRegistered.mockReturnValue({
        registered: { name: 'title' },
      });
    });

    it('renders "core" page', async () => {
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings);
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });

    it('renders "core" page for blank basepath', async () => {
      const [render, deps] = await getRender();
      deps.http.basePath.get.mockReturnValueOnce('');

      const content = await render(createKibanaRequest(), uiSettings);
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });

    it('renders "core" page driven by settings', async () => {
      const userSettings = { 'theme:darkMode': { userValue: true } };
      uiSettings.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings);
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.uiSettings.user).toEqual(userSettings); // user settings are injected
    });

    it('renders "core" with excluded user settings', async () => {
      const userSettings = { 'theme:darkMode': { userValue: true } };
      uiSettings.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings, {
        isAnonymousPage: true,
      });
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.uiSettings.user).toEqual({}); // user settings are not injected
    });

    it('calls `getStylesheetPaths` with the correct parameters', async () => {
      getSettingValueMock.mockImplementation((settingName: string) => {
        if (settingName === 'theme:darkMode') {
          return true;
        }
        return settingName;
      });

      const [render] = await getRender();
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
}

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenderingService(mockRenderingServiceParams);

    getSettingValueMock.mockImplementation((settingName: string) => settingName);
    getStylesheetPathsMock.mockReturnValue(['/style-1.css', '/style-2.css']);
  });

  describe('preboot()', () => {
    it('calls `registerBootstrapRoute` with the correct parameters', async () => {
      const routerMock = mockRouter.create();
      mockRenderingPrebootDeps.http.registerRoutes.mockImplementation((path, callback) =>
        callback(routerMock)
      );

      await service.preboot(mockRenderingPrebootDeps);

      expect(registerBootstrapRouteMock).toHaveBeenCalledTimes(1);
      expect(registerBootstrapRouteMock).toHaveBeenCalledWith({
        router: routerMock,
        renderer: bootstrapRendererMock,
      });
    });

    renderTestCases(async () => {
      return [(await service.preboot(mockRenderingPrebootDeps)).render, mockRenderingPrebootDeps];
    });
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

    renderTestCases(async () => {
      await service.preboot(mockRenderingPrebootDeps);
      return [(await service.setup(mockRenderingSetupDeps)).render, mockRenderingSetupDeps];
    });
  });
});
