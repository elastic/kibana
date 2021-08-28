/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getKibanaTranslationFilesMock,
  initTranslationsMock,
  registerRoutesMock,
} from './i18n_service.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { I18nService } from './i18n_service';

import { configServiceMock } from '../config/mocks';
import { mockCoreContext } from '../core_context.mock';
import { httpServiceMock } from '../mocks';

const getConfigService = (locale = 'en') => {
  const configService = configServiceMock.create();
  configService.atPath.mockImplementation((path) => {
    if (path === 'i18n') {
      return new BehaviorSubject({
        locale,
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

  beforeEach(() => {
    jest.clearAllMocks();
    configService = getConfigService();

    const coreContext = mockCoreContext.create({ configService });
    service = new I18nService(coreContext);

    httpPreboot = httpServiceMock.createInternalPrebootContract();
    httpPreboot.registerRoutes.mockImplementation((type, callback) =>
      callback(httpServiceMock.createRouter())
    );
    httpSetup = httpServiceMock.createInternalSetupContract();
  });

  describe('#preboot', () => {
    it('calls `getKibanaTranslationFiles` with the correct parameters', async () => {
      getKibanaTranslationFilesMock.mockResolvedValue([]);

      const pluginPaths = ['/pathA', '/pathB'];
      await service.preboot({ pluginPaths, http: httpPreboot });

      expect(getKibanaTranslationFilesMock).toHaveBeenCalledTimes(1);
      expect(getKibanaTranslationFilesMock).toHaveBeenCalledWith('en', pluginPaths);
    });

    it('calls `initTranslations` with the correct parameters', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      await service.preboot({ pluginPaths: [], http: httpPreboot });

      expect(initTranslationsMock).toHaveBeenCalledTimes(1);
      expect(initTranslationsMock).toHaveBeenCalledWith('en', translationFiles);
    });

    it('calls `registerRoutesMock` with the correct parameters', async () => {
      await service.preboot({ pluginPaths: [], http: httpPreboot });

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith({
        locale: 'en',
        router: expect.any(Object),
      });
    });
  });

  describe('#setup', () => {
    beforeEach(async () => {
      await service.preboot({ pluginPaths: ['/pathPrebootA'], http: httpPreboot });

      // Reset mocks that were used in the `preboot`.
      getKibanaTranslationFilesMock.mockClear();
      initTranslationsMock.mockClear();
      registerRoutesMock.mockClear();
    });

    it('calls `getKibanaTranslationFiles` with the correct parameters', async () => {
      getKibanaTranslationFilesMock.mockResolvedValue([]);

      const pluginPaths = ['/pathA', '/pathB'];
      await service.setup({ pluginPaths, http: httpSetup });

      expect(getKibanaTranslationFilesMock).toHaveBeenCalledTimes(1);
      expect(getKibanaTranslationFilesMock).toHaveBeenCalledWith('en', pluginPaths);
    });

    it('calls `initTranslations` with the correct parameters', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      await service.setup({ pluginPaths: [], http: httpSetup });

      expect(initTranslationsMock).toHaveBeenCalledTimes(1);
      expect(initTranslationsMock).toHaveBeenCalledWith('en', translationFiles);
    });

    it('calls `registerRoutesMock` with the correct parameters', async () => {
      await service.setup({ pluginPaths: [], http: httpSetup });

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith({
        locale: 'en',
        router: expect.any(Object),
      });
    });

    it('returns accessors for locale and translation files', async () => {
      const translationFiles = ['/path/to/file', 'path/to/another/file'];
      getKibanaTranslationFilesMock.mockResolvedValue(translationFiles);

      const { getLocale, getTranslationFiles } = await service.setup({
        pluginPaths: [],
        http: httpSetup,
      });

      expect(getLocale()).toEqual('en');
      expect(getTranslationFiles()).toEqual(translationFiles);
    });
  });
});
