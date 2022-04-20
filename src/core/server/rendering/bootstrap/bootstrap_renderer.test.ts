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
import { UiPlugins } from '../../plugins';
import { httpServiceMock } from '../../http/http_service.mock';
import { httpServerMock } from '../../http/http_server.mocks';
import { AuthStatus } from '../../http';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';
import { bootstrapRendererFactory, BootstrapRenderer } from './bootstrap_renderer';

const createPackageInfo = (parts: Partial<PackageInfo> = {}): PackageInfo => ({
  branch: 'master',
  buildNum: 42,
  buildSha: 'buildSha',
  dist: false,
  version: '8.0.0',
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

  beforeEach(() => {
    auth = httpServiceMock.createAuth();
    uiSettingsClient = uiSettingsServiceMock.createClient();
    uiPlugins = createUiPlugins();
    packageInfo = createPackageInfo();

    getThemeTagMock.mockReturnValue('v8light');
    getPluginsBundlePathsMock.mockReturnValue(new Map());
    renderTemplateMock.mockReturnValue('__rendered__');
    getJsDependencyPathsMock.mockReturnValue([]);

    renderer = bootstrapRendererFactory({
      auth,
      packageInfo,
      uiPlugins,
      serverBasePath: '/base-path',
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

      expect(uiSettingsClient.get).toHaveBeenCalledTimes(2);
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:darkMode');
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:version');
    });

    it('calls getThemeTag with the correct parameters', async () => {
      uiSettingsClient.get.mockImplementation((settingName) => {
        return Promise.resolve(settingName === 'theme:darkMode' ? true : 'v8');
      });

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

      expect(uiSettingsClient.get).toHaveBeenCalledTimes(2);
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:darkMode');
      expect(uiSettingsClient.get).toHaveBeenCalledWith('theme:version');
    });

    it('calls getThemeTag with the correct parameters', async () => {
      uiSettingsClient.get.mockImplementation((settingName) => {
        return Promise.resolve(settingName === 'theme:darkMode' ? true : 'v8');
      });

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
        regularBundlePath: '/base-path/42/bundles',
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
