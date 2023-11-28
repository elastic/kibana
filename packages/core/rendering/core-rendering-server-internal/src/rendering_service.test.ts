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

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import {
  mockRenderingServiceParams,
  mockRenderingPrebootDeps,
  mockRenderingSetupDeps,
} from './test_helpers/params';
import { InternalRenderingServicePreboot, InternalRenderingServiceSetup } from './types';
import { RenderingService } from './rendering_service';
import { AuthStatus } from '@kbn/core-http-server';

const BUILD_DATE = '2023-05-15T23:12:09+0000';
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
      buildDate: new Date(BUILD_DATE).toISOString(),
      buildFlavor: expect.any(String),
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
    let uiSettings: {
      client: ReturnType<typeof uiSettingsServiceMock.createClient>;
      globalClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
    };

    beforeEach(async () => {
      uiSettings = {
        client: uiSettingsServiceMock.createClient(),
        globalClient: uiSettingsServiceMock.createClient(),
      };
      uiSettings.client.getRegistered.mockReturnValue({
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

    it('renders "core" page for unauthenticated requests', async () => {
      mockRenderingSetupDeps.http.auth.get.mockReturnValueOnce({
        status: AuthStatus.unauthenticated,
        state: {},
      });

      const [render] = await getRender();
      const content = await render(
        createKibanaRequest({ auth: { isAuthenticated: false } }),
        uiSettings
      );
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
      uiSettings.client.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings);
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.uiSettings.user).toEqual(userSettings); // user settings are injected
    });

    it('renders "core" page with global settings', async () => {
      const userSettings = { 'foo:bar': { userValue: true } };
      uiSettings.globalClient.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings);
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.globalUiSettings.user).toEqual(userSettings); // user settings are injected
    });

    it('renders "core" with excluded user settings', async () => {
      const userSettings = { 'theme:darkMode': { userValue: true } };
      uiSettings.client.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings, {
        isAnonymousPage: true,
      });
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.uiSettings.user).toEqual({}); // user settings are not injected
    });

    it('renders "core" with excluded global user settings', async () => {
      const userSettings = { 'foo:bar': { userValue: true } };
      uiSettings.globalClient.getUserProvided.mockResolvedValue(userSettings);
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings, {
        isAnonymousPage: true,
      });
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');

      expect(data).toMatchSnapshot(INJECTED_METADATA);
      expect(data.legacyMetadata.globalUiSettings.user).toEqual({}); // user settings are not injected
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
        baseHref: '/mock-server-basepath',
        buildNum: expect.any(Number),
      });
    });

    it('renders "core" CDN url injected', async () => {
      const userSettings = { 'theme:darkMode': { userValue: true } };
      uiSettings.client.getUserProvided.mockResolvedValue(userSettings);
      (mockRenderingPrebootDeps.http.staticAssets.getHrefBase as jest.Mock).mockImplementation(
        () => 'http://foo.bar:1773'
      );
      const [render] = await getRender();
      const content = await render(createKibanaRequest(), uiSettings, {
        isAnonymousPage: false,
      });
      const dom = load(content);
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data') ?? '""');
      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });
  });
}

function renderDarkModeTestCases(
  getRender: () => Promise<
    [
      InternalRenderingServicePreboot['render'] | InternalRenderingServiceSetup['render'],
      typeof mockRenderingPrebootDeps | typeof mockRenderingSetupDeps
    ]
  >
) {
  describe('render() Dark Mode tests', () => {
    let uiSettings: {
      client: ReturnType<typeof uiSettingsServiceMock.createClient>;
      globalClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
    };

    beforeEach(async () => {
      uiSettings = {
        client: uiSettingsServiceMock.createClient(),
        globalClient: uiSettingsServiceMock.createClient(),
      };
      uiSettings.client.getRegistered.mockReturnValue({
        registered: { name: 'title' },
      });
    });

    describe('Dark Mode', () => {
      it('UserSettings darkMode === true should override the space setting', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(true)
        );

        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return false;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: false } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);

        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: true,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('UserSettings darkMode === false should override the space setting', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(false)
        );

        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return true;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: false } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);

        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: false,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('Space setting value should be used if UsersSettings value is undefined', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(undefined)
        );
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return false;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: false } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);
        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: false,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('config `theme:darkMode: true` setting should override User Settings theme `darkMode === false', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(false)
        );
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return true;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: true, isOverridden: true } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);
        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: true,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('config `theme:darkMode: false` setting should override User Settings theme `darkMode === true', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(true)
        );
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return false;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: false, isOverridden: true } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);
        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: false,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('config `theme:darkMode: false` setting should override User Settings theme `darkMode === undefined', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(undefined)
        );
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return false;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: false, isOverridden: true } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);
        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: false,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });

      it('config `theme:darkMode: true` setting should override User Settings theme `darkMode === undefined', async () => {
        mockRenderingSetupDeps.userSettings.getUserSettingDarkMode.mockReturnValueOnce(
          Promise.resolve(undefined)
        );
        getSettingValueMock.mockImplementation((settingName: string) => {
          if (settingName === 'theme:darkMode') {
            return true;
          }
          return settingName;
        });

        const settings = { 'theme:darkMode': { userValue: true, isOverridden: true } };
        uiSettings.client.getUserProvided.mockResolvedValue(settings);
        const [render] = await getRender();
        await render(createKibanaRequest(), uiSettings);

        expect(getStylesheetPathsMock).toHaveBeenCalledWith({
          darkMode: true,
          themeVersion: 'v8',
          baseHref: '/mock-server-basepath',
          buildNum: expect.any(Number),
        });
      });
    });
  });
}

describe('RenderingService', () => {
  let service: RenderingService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(BUILD_DATE));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
    renderDarkModeTestCases(async () => {
      await service.preboot(mockRenderingPrebootDeps);
      return [(await service.setup(mockRenderingSetupDeps)).render, mockRenderingSetupDeps];
    });
  });
});
