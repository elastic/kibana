/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { InjectedMetadataService, InjectedMetadataSetup } from './injected_metadata_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InjectedMetadataSetup> = {
    getBasePath: jest.fn(),
    getServerBasePath: jest.fn(),
    getPublicBaseUrl: jest.fn(),
    getKibanaVersion: jest.fn(),
    getKibanaBranch: jest.fn(),
    getCspConfig: jest.fn(),
    getExternalUrlConfig: jest.fn(),
    getAnonymousStatusPage: jest.fn(),
    getLegacyMetadata: jest.fn(),
    getPlugins: jest.fn(),
    getInjectedVar: jest.fn(),
    getInjectedVars: jest.fn(),
    getKibanaBuildNumber: jest.fn(),
  };
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
  } as any);
  setupContract.getPlugins.mockReturnValue([]);
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
