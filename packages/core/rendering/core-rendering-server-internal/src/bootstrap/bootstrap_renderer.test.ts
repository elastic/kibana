/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  renderTemplateMock,
  getPluginsBundlePathsMock,
  getThemeTagMock,
  getJsDependencyPathsMock,
} from './bootstrap_renderer.test.mocks';

import { PackageInfo } from '@kbn/config';
import { AuthStatus } from '@kbn/core-http-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { bootstrapRendererFactory, BootstrapRenderer } from './bootstrap_renderer';
import { userSettingsServiceMock } from '@kbn/core-user-settings-server-mocks';

const createPackageInfo = (parts: Partial<PackageInfo> = {}): PackageInfo => ({
  branch: 'master',
  buildNum: 42,
  buildSha: 'buildSha',
  buildDate: new Date('2023-05-15T23:12:09.000Z'),
  dist: false,
  version: '8.0.0',
  buildFlavor: 'traditional',
  ...parts,
});

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

  beforeEach(() => {
    auth = httpServiceMock.createAuth();
    uiSettingsClient = uiSettingsServiceMock.createClient();
    uiPlugins = createUiPlugins();
    packageInfo = createPackageInfo();
    userSettingsService = userSettingsServiceMock.createSetupContract();

    getThemeTagMock.mockReturnValue('v8light');
    getPluginsBundlePathsMock.mockReturnValue(new Map());
    renderTemplateMock.mockReturnValue('__rendered__');
    getJsDependencyPathsMock.mockReturnValue([]);

    renderer = bootstrapRendererFactory({
      auth,
      packageInfo,
      uiPlugins,
      baseHref: '/base-path',
    });
  });

  afterEach(() => {
    getThemeTagMock.mockReset();
    getPluginsBundlePathsMock.mockReset();
    renderTemplateMock.mockReset();
    getJsDependencyPathsMock.mockReset();
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

    it('calls getThemeTag with the values from the UiSettingsClient (true/dark) when the UserSettingsService is not provided', async () => {
      uiSettingsClient.get.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: true,
      });
    });

    it('calls getThemeTag with the values from the UiSettingsClient (false/light) when the UserSettingsService is not provided', async () => {
      uiSettingsClient.get.mockResolvedValue(false);

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: false,
      });
    });

    it('calls getThemeTag with values (true/dark) from the UserSettingsService when provided', async () => {
      userSettingsService.getUserSettingDarkMode.mockReturnValueOnce(true);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
      });

      uiSettingsClient.get.mockResolvedValue(false);
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: true,
      });
    });

    it('calls getThemeTag with values (false/light) from the UserSettingsService when provided', async () => {
      userSettingsService.getUserSettingDarkMode.mockReturnValueOnce(false);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
      });

      uiSettingsClient.get.mockResolvedValue(true);
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: false,
      });
    });

    it('calls getThemeTag with values from the UiSettingsClient when values (false/light) from UserSettingsService are `undefined`', async () => {
      userSettingsService.getUserSettingDarkMode.mockReturnValueOnce(undefined);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
      });

      uiSettingsClient.get.mockResolvedValue(false);
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: false,
      });
    });

    it('calls getThemeTag with values from the UiSettingsClient when values (true/dark) from UserSettingsService are `undefined`', async () => {
      userSettingsService.getUserSettingDarkMode.mockReturnValueOnce(undefined);

      renderer = bootstrapRendererFactory({
        auth,
        packageInfo,
        uiPlugins,
        baseHref: '/base-path',
        userSettingsService,
      });

      uiSettingsClient.get.mockResolvedValue(true);
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: true,
      });
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

    it('calls getThemeTag with the correct parameters', async () => {
      uiSettingsClient.get.mockResolvedValue(true);

      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: true,
      });
    });
  });

  describe('when the auth status is `unauthenticated`', () => {
    beforeEach(() => {
      auth.get.mockReturnValue({
        status: 'unauthenticated' as AuthStatus,
        state: {},
      });
    });

    it('does not call uiSettingsClient.get', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(uiSettingsClient.get).not.toHaveBeenCalled();
    });

    it('calls getThemeTag with the default parameters', async () => {
      const request = httpServerMock.createKibanaRequest();

      await renderer({
        request,
        uiSettingsClient,
      });

      expect(getThemeTagMock).toHaveBeenCalledTimes(1);
      expect(getThemeTagMock).toHaveBeenCalledWith({
        themeVersion: 'v8',
        darkMode: false,
      });
    });
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
        bundlesHref: '/base-path/42/bundles',
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
      '/base-path/42/bundles',
      pluginsBundlePaths
    );
  });

  it('calls renderTemplate with the correct parameters', async () => {
    getThemeTagMock.mockReturnValue('customThemeTag');
    getJsDependencyPathsMock.mockReturnValue(['path-1', 'path-2']);

    const request = httpServerMock.createKibanaRequest();

    await renderer({
      request,
      uiSettingsClient,
    });

    expect(renderTemplateMock).toHaveBeenCalledTimes(1);
    expect(renderTemplateMock).toHaveBeenCalledWith({
      themeTag: 'customThemeTag',
      jsDependencyPaths: ['path-1', 'path-2'],
      publicPathMap: expect.any(String),
    });
  });
});
