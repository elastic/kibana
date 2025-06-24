/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  renderTemplateMock,
  getPluginsBundlePathsMock,
  getJsDependencyPathsMock,
} from './bootstrap_renderer.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { PackageInfo } from '@kbn/config';
import { AuthStatus } from '@kbn/core-http-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { bootstrapRendererFactory, BootstrapRenderer } from './bootstrap_renderer';
import { userSettingsServiceMock } from '@kbn/core-user-settings-server-mocks';
import { DEFAULT_THEME_NAME, ThemeName } from '@kbn/core-ui-settings-common';

const createPackageInfo = (parts: Partial<PackageInfo> = {}): PackageInfo => ({
  branch: 'master',
  buildNum: 42,
  buildSha: 'buildSha',
  buildShaShort: 'buildShaShort',
  buildDate: new Date('2023-05-15T23:12:09.000Z'),
  dist: false,
  version: '8.0.0',
  buildFlavor: 'traditional',
  ...parts,
});

const getClientGetMockImplementation =
  ({ darkMode, name }: { darkMode?: boolean | string; name?: string } = {}) =>
  (key: string) => {
    if (key === 'theme:darkMode') {
      return Promise.resolve(darkMode ?? false);
    }

    return Promise.resolve();
  };

const createUiPlugins = (): UiPlugins => ({
  public: new Map(),
  internal: new Map(),
  browserConfigs: new Map(),
});

describe('bootstrapRenderer', () => {
  let auth: ReturnType<typeof httpServiceMock.createAuth>;
  let uiSettingsClient: ReturnType<typeof uiSettingsServiceMock.createClient>;
  let renderer: BootstrapRenderer;
  let uiPlugins: UiPlugins;
  let packageInfo: PackageInfo;
  let userSettingsService: ReturnType<typeof userSettingsServiceMock.createSetupContract>;
  let themeName$: BehaviorSubject<ThemeName>;

  beforeEach(() => {
    themeName$ = new BehaviorSubject<ThemeName>(DEFAULT_THEME_NAME);
    auth = httpServiceMock.createAuth();
    uiSettingsClient = uiSettingsServiceMock.createClient();
    uiPlugins = createUiPlugins();
    packageInfo = createPackageInfo();
    userSettingsService = userSettingsServiceMock.createSetupContract();

    getPluginsBundlePathsMock.mockReturnValue(new Map());
    renderTemplateMock.mockReturnValue('__rendered__');
    getJsDependencyPathsMock.mockReturnValue([]);
    uiSettingsClient.get.mockImplementation(getClientGetMockImplementation());

    renderer = bootstrapRendererFactory({
      auth,
      packageInfo,
      uiPlugins,
      baseHref: `/base-path/${packageInfo.buildShaShort}`, // the base href as provided by static assets module
      themeName$,
    });
  });

  afterEach(() => {
    getPluginsBundlePathsMock.mockReset();
    renderTemplateMock.mockReset();
    getJsDependencyPathsMock.mockReset();
    themeName$.complete();
  });

  describe('when the auth status is `authenticated`', () => {
    beforeEach(() => {
      auth.get.mockReturnValue({
        status: 'authenticated' as AuthStatus,
        state: {},
      });
    });

    it('calls uiSettingsClient.get with the correct parameters', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(uiSettingsClient.get).toHaveBeenCalledTimes(1);
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:darkMode');
    });

    it('calls renderTemplate with the values from the UiSettingsClient (true/dark) when the UserSettingsService is not provided', async () => {
      uiSettingsClient.get.mockImplementation(
        getClientGetMockImplementation({
          darkMode: true,
        })
      );
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'dark',
        })
      );
    });

    it('calls renderTemplate with the values from the UiSettingsClient (false/light) when the UserSettingsService is not provided', async () => {
      uiSettingsClient.get.mockImplementation(getClientGetMockImplementation({}));

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'light',
        })
      );
    });

    it('calls renderTemplate with values (true/dark) from the UserSettingsService when provided', async () => {
      userSettingsService.getUserSettingDarkMode.mockResolvedValueOnce(true);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
        themeName$,
      });

      uiSettingsClient.get.mockResolvedValue(false);
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'dark',
        })
      );
    });

    it('calls renderTemplate with values (false/light) from the UserSettingsService when provided', async () => {
      userSettingsService.getUserSettingDarkMode.mockResolvedValueOnce(false);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
        themeName$,
      });

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'light',
        })
      );
    });

    it('calls renderTemplate with values from the UiSettingsClient when values (false/light) from UserSettingsService are `undefined`', async () => {
      userSettingsService.getUserSettingDarkMode.mockResolvedValueOnce(undefined);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
        themeName$,
      });

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'light',
        })
      );
    });

    it('calls renderTemplate with values from the UiSettingsClient when values (true/dark) from UserSettingsService are `undefined`', async () => {
      userSettingsService.getUserSettingDarkMode.mockResolvedValueOnce(undefined);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
        themeName$,
      });

      uiSettingsClient.get.mockImplementation(
        getClientGetMockImplementation({
          darkMode: true,
        })
      );
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'dark',
        })
      );
    });
  });

  describe('when the auth status is `unknown`', () => {
    beforeEach(() => {
      auth.get.mockReturnValue({
        status: 'unknown' as AuthStatus,
        state: {},
      });
    });

    it('calls uiSettingsClient.get with the correct parameters', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(uiSettingsClient.get).toHaveBeenCalledTimes(1);
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:darkMode');
    });

    it('calls renderTemplate with the correct parameters', async () => {
      uiSettingsClient.get.mockImplementation(
        getClientGetMockImplementation({
          darkMode: true,
        })
      );

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'dark',
        })
      );
    });

    it('calls renderTemplate with the correct parameters when darkMode is `system`', async () => {
      uiSettingsClient.get.mockImplementation(
        getClientGetMockImplementation({
          darkMode: 'system',
        })
      );

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'system',
        })
      );
    });
  });

  describe('when the auth status is `unauthenticated`', () => {
    beforeEach(() => {
      auth.get.mockReturnValue({
        status: 'unauthenticated' as AuthStatus,
        state: {},
      });
    });

    it('does not call uiSettingsClient.get with `theme:darkMode`', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(uiSettingsClient.get).not.toHaveBeenCalledWith('theme:darkMode');
    });

    it('calls renderTemplate with the default parameters', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(renderTemplateMock).toHaveBeenCalledTimes(1);
      expect(renderTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          themeTagName: 'borealis',
          colorMode: 'light',
        })
      );
    });
  });

  it('calls renderTemplate with the correct theme name', async () => {
    uiSettingsClient.get.mockImplementation(
      getClientGetMockImplementation({
        darkMode: true,
      })
    );
    const request = httpServerMock.createKibanaRequest();

    await renderer({
      request,
      uiSettingsClient,
    });

    expect(renderTemplateMock).toHaveBeenCalledTimes(1);
    expect(renderTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        themeTagName: themeName$.getValue(),
      })
    );

    themeName$.next('amsterdam');
    await renderer({
      request,
      uiSettingsClient,
    });

    expect(renderTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        themeTagName: 'v8',
      })
    );
  });

  [false, true].forEach((isAnonymousPage) => {
    it(`calls getPluginsBundlePaths with the correct parameters when isAnonymousPage=${isAnonymousPage}`, async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
        isAnonymousPage,
      });

      expect(getPluginsBundlePathsMock).toHaveBeenCalledTimes(1);
      expect(getPluginsBundlePathsMock).toHaveBeenCalledWith({
        isAnonymousPage,
        uiPlugins,
        bundlesHref: '/base-path/buildShaShort/bundles',
      });
    });
  });

  // here
  it('calls getJsDependencyPaths with the correct parameters', async () => {
    const pluginsBundlePaths = new Map<string, unknown>();

    getPluginsBundlePathsMock.mockReturnValue(pluginsBundlePaths);
    const request = httpServerMock.createKibanaRequest();

    await renderer({
      request,
      uiSettingsClient,
    });

    expect(getJsDependencyPathsMock).toHaveBeenCalledTimes(1);
    expect(getJsDependencyPathsMock).toHaveBeenCalledWith(
      '/base-path/buildShaShort/bundles',
      pluginsBundlePaths
    );
  });

  it('calls renderTemplate with the correct parameters', async () => {
    getJsDependencyPathsMock.mockReturnValue(['path-1', 'path-2']);

    const request = httpServerMock.createKibanaRequest();

    await renderer({
      request,
      uiSettingsClient,
    });

    expect(renderTemplateMock).toHaveBeenCalledTimes(1);
    expect(renderTemplateMock).toHaveBeenCalledWith({
      themeTagName: 'borealis',
      colorMode: 'light',
      jsDependencyPaths: ['path-1', 'path-2'],
      publicPathMap: expect.any(String),
    });
  });
});
