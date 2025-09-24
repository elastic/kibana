/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';

export const injectedMetadata = {
  getKibanaBranch: () => 'main',
  getKibanaVersion: () => '9.1.0',
  getKibanaBuildNumber: () => 12345,
  getBasePath: () => '',
  getServerBasePath: () => '',
  getPublicBaseUrl: () => '',
  getElasticsearchInfo: () => ({
    cluster_uuid: 'test-cluster-uuid',
    cluster_name: 'test-cluster-name',
    cluster_version: '8.0.0',
    cluster_build_flavor: 'development',
  }),
  getCspConfig: () =>
    ({
      warnLegacyBrowsers: true,
    } as unknown),
  getTheme: () =>
    ({
      darkMode: 'light',
      name: 'default',
      version: '1.0.0',
      stylesheetPaths: {
        default: [],
        dark: [],
      },
    } as unknown),
  getExternalUrlConfig: () => ({
    policy: [
      {
        allow: true,
        host: undefined,
        protocol: undefined,
      },
    ],
  }),
  getAnonymousStatusPage: () => false,
  getLegacyMetadata: () => ({
    uiSettings: {
      defaults: {},
      user: {},
    },
    globalUiSettings: {
      defaults: {},
      user: {},
    },
  }),
  getPlugins: () => [],
  getAssetsHrefBase: () => '/ui/',
  getCustomBranding: () => ({}),
  getFeatureFlags: () => ({
    overrides: {},
    initialFeatureFlags: {},
  }),
} as unknown as InternalInjectedMetadataSetup;
