/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAllKibanaTranslationFilesMock,
  groupFilesByLocaleMock,
  computeLocaleFileHashMock,
  initTranslationsMock,
  registerRoutesMock,
} from './i18n_service.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { I18nService } from './i18n_service';

import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';

const getConfigService = (
  defaultLocale = 'en',
  locales: string[] = ['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE']
) => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'i18n') {
      return new BehaviorSubject({
        defaultLocale,
        locales,
      });
    }
    return new BehaviorSubject({});
  });
  return configService;
};

describe('I18nService', () => {
  let service: I18nService;
  let configService: ReturnType<typeof configServiceMock.create>;
  let httpPreboot: ReturnType<typeof httpServiceMock.createInternalPrebootContract>;
  let httpSetup: ReturnType<typeof httpServiceMock.createInternalSetupContract>;
  let coreContext: ReturnType<typeof mockCoreContext.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    groupFilesByLocaleMock.mockReturnValue({});
    computeLocaleFileHashMock.mockResolvedValue('mock-file-hash');
    configService = getConfigService();

    coreContext = mockCoreContext.create({ configService });
    service = new I18nService(coreContext);

    httpPreboot = httpServiceMock.createInternalPrebootContract();
    httpPreboot.registerRoutes.mockImplementation((type, callback) =>
      callback(httpServiceMock.createRouter())
    );
    httpSetup = httpServiceMock.createInternalSetupContract();
  });

  describe('#preboot', () => {
    it('calls `getAllKibanaTranslationFiles` with the correct parameters', async () => {
      getAllKibanaTranslationFilesMock.mockResolvedValue([]);

      const pluginPaths = ['/pathA', '/pathB'];
      await service.preboot({ pluginPaths, http: httpPreboot });

      expect(getAllKibanaTranslationFilesMock).toHaveBeenCalledTimes(1);
      expect(getAllKibanaTranslationFilesMock).toHaveBeenCalledWith(pluginPaths, [
        'en',
        'fr-FR',
        'ja-JP',
        'zh-CN',
        'de-DE',
      ]);
    });

    it('calls `initTranslations` with the correct parameters', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getAllKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      await service.preboot({ pluginPaths: [], http: httpPreboot });

      expect(initTranslationsMock).toHaveBeenCalledTimes(1);
      expect(initTranslationsMock).toHaveBeenCalledWith('en', translationFiles);
    });

    it('calls `registerRoutes` with the correct parameters', async () => {
      await service.preboot({ pluginPaths: [], http: httpPreboot });

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith({
        locale: 'en',
        router: expect.any(Object),
        isDist: coreContext.env.packageInfo.dist,
        translationHashes: expect.any(Object),
        localeFileMap: expect.any(Object),
      });
    });
  });

  describe('#setup', () => {
    beforeEach(async () => {
      await service.preboot({ pluginPaths: ['/pathPrebootA'], http: httpPreboot });

      // Reset mocks that were used in the `preboot`.
      getAllKibanaTranslationFilesMock.mockClear();
      initTranslationsMock.mockClear();
      registerRoutesMock.mockClear();
    });

    it('calls `getAllKibanaTranslationFiles` with the correct parameters', async () => {
      getAllKibanaTranslationFilesMock.mockResolvedValue([]);

      const pluginPaths = ['/pathA', '/pathB'];
      await service.setup({ pluginPaths, http: httpSetup });

      expect(getAllKibanaTranslationFilesMock).toHaveBeenCalledTimes(1);
      expect(getAllKibanaTranslationFilesMock).toHaveBeenCalledWith(pluginPaths, [
        'en',
        'fr-FR',
        'ja-JP',
        'zh-CN',
        'de-DE',
      ]);
    });

    it('calls `initTranslations` with the correct parameters', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getAllKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      await service.setup({ pluginPaths: [], http: httpSetup });

      expect(initTranslationsMock).toHaveBeenCalledTimes(1);
      expect(initTranslationsMock).toHaveBeenCalledWith('en', translationFiles);
    });

    it('calls `registerRoutes` with the correct parameters', async () => {
      await service.setup({ pluginPaths: [], http: httpSetup });

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith({
        locale: 'en',
        router: expect.any(Object),
        isDist: coreContext.env.packageInfo.dist,
        translationHashes: expect.any(Object),
        localeFileMap: expect.any(Object),
      });
    });

    it('returns accessors for locale and translation files', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getAllKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      const { getLocale, getLocales, getAvailableLocales, getTranslationFiles } =
        await service.setup({
          pluginPaths: [],
          http: httpSetup,
        });

      expect(getLocale()).toEqual('en');
      expect(getLocales()).toEqual(['en', 'fr-FR', 'ja-JP', 'zh-CN', 'de-DE']);
      // Labels come from Intl.DisplayNames in the endonym pattern. Each
      // language's own orthographic convention applies — French does not
      // capitalise language names, hence "français" (lowercase).
      expect(getAvailableLocales()).toEqual([
        { id: 'en', label: 'English' },
        { id: 'fr-FR', label: 'français' },
        { id: 'ja-JP', label: '日本語' },
        { id: 'zh-CN', label: '中文' },
        { id: 'de-DE', label: 'Deutsch' },
      ]);
      expect(getTranslationFiles()).toEqual(translationFiles);
    });

    it('hashes the defaultLocale even when i18n.locales is empty', async () => {
      configService = getConfigService('en', []);
      coreContext = mockCoreContext.create({ configService });
      service = new I18nService(coreContext);
      await service.preboot({ pluginPaths: [], http: httpPreboot });
      registerRoutesMock.mockClear();

      const { getLocales, getAvailableLocales } = await service.setup({
        pluginPaths: [],
        http: httpSetup,
      });

      expect(getLocales()).toEqual([]);
      expect(getAvailableLocales()).toEqual([]);
      expect(registerRoutesMock).toHaveBeenCalledWith({
        locale: 'en',
        router: expect.any(Object),
        isDist: coreContext.env.packageInfo.dist,
        translationHashes: expect.objectContaining({ en: expect.any(String) }),
        localeFileMap: expect.any(Object),
      });
    });
  });
});
