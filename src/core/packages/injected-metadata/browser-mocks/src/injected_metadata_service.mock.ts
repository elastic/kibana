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
import { lazyObject } from '@kbn/lazy-object';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalInjectedMetadataSetup> = lazyObject({
    getBasePath: jest.fn().mockReturnValue('/base-path'),
    getServerBasePath: jest.fn().mockReturnValue('/server-base-path'),
    getAssetsHrefBase: jest.fn().mockReturnValue('/assets-base-path'),
    getPublicBaseUrl: jest.fn(),
    getKibanaVersion: jest.fn().mockReturnValue('kibanaVersion'),
    getKibanaBranch: jest.fn(),
    getElasticsearchInfo: jest.fn(),
    getCspConfig: jest.fn().mockReturnValue({ warnLegacyBrowsers: true }),
    getExternalUrlConfig: jest.fn().mockReturnValue({ policy: [] }),
    getAnonymousStatusPage: jest.fn().mockReturnValue(false),
    getLegacyMetadata: jest.fn().mockReturnValue({
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
    } as any),
    getTheme: jest.fn().mockReturnValue({
      darkMode: false,
      name: 'borealis',
      version: 'v8',
      stylesheetPaths: {
        default: ['light-1.css'],
        dark: ['dark-1.css'],
      },
    }),
    getPlugins: jest.fn().mockReturnValue([]),
    getKibanaBuildNumber: jest.fn(),
    getCustomBranding: jest.fn(),
    getFeatureFlags: jest.fn(),
  });

  return setupContract;
};

const createStartContractMock = createSetupContractMock;

type InjectedMetadataServiceContract = PublicMethodsOf<InjectedMetadataService>;
const createMock = (): jest.Mocked<InjectedMetadataServiceContract> =>
  lazyObject({
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
  });

export const injectedMetadataServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
