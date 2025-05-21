/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  InjectedMetadataService,
  InternalInjectedMetadataSetup,
} from '@kbn/core-injected-metadata-browser-internal';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalInjectedMetadataSetup> = {
    getBasePath: jest.fn(),
    getServerBasePath: jest.fn(),
    getAssetsHrefBase: jest.fn(),
    getPublicBaseUrl: jest.fn(),
    getKibanaVersion: jest.fn(),
    getKibanaBranch: jest.fn(),
    getElasticsearchInfo: jest.fn(),
    getCspConfig: jest.fn(),
    getExternalUrlConfig: jest.fn(),
    getAnonymousStatusPage: jest.fn(),
    getLegacyMetadata: jest.fn(),
    getTheme: jest.fn(),
    getPlugins: jest.fn(),
    getKibanaBuildNumber: jest.fn(),
    getCustomBranding: jest.fn(),
    getFeatureFlags: jest.fn(),
  };
  setupContract.getBasePath.mockReturnValue('/base-path');
  setupContract.getServerBasePath.mockReturnValue('/server-base-path');
  setupContract.getAssetsHrefBase.mockReturnValue('/assets-base-path');
  setupContract.getCspConfig.mockReturnValue({ warnLegacyBrowsers: true });
  setupContract.getExternalUrlConfig.mockReturnValue({ policy: [] });
  setupContract.getKibanaVersion.mockReturnValue('kibanaVersion');
  setupContract.getAnonymousStatusPage.mockReturnValue(false);
  setupContract.getLegacyMetadata.mockReturnValue({
    app: {
      id: 'foo',
      title: 'Foo App',
    },
    nav: [],
    uiSettings: {
      defaults: { legacyInjectedUiSettingDefaults: true },
      user: { legacyInjectedUiSettingUserValues: true },
    },
    globalSettings: {
      defaults: { legacyInjectedUiSettingDefaults: true },
      user: { legacyInjectedUiSettingUserValues: true },
    },
  } as any);
  setupContract.getPlugins.mockReturnValue([]);
  setupContract.getTheme.mockReturnValue({
    darkMode: false,
    name: 'amsterdam',
    version: 'v8',
    stylesheetPaths: {
      default: ['light-1.css'],
      dark: ['dark-1.css'],
    },
  });
  return setupContract;
};

const createStartContractMock = createSetupContractMock;

type InjectedMetadataServiceContract = PublicMethodsOf<InjectedMetadataService>;
const createMock = (): jest.Mocked<InjectedMetadataServiceContract> => ({
  setup: jest.fn().mockReturnValue(createSetupContractMock()),
  start: jest.fn().mockReturnValue(createStartContractMock()),
});

export const injectedMetadataServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
