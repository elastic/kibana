/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';

export interface InjectedMetadataOptions {
  kibanaBranch?: string;
  kibanaVersion?: string;
  kibanaBuildNumber?: number;
  basePath?: string;
  serverBasePath?: string;
  publicBaseUrl?: string;
  elasticsearchClusterUuid?: string;
  elasticsearchClusterName?: string;
  elasticsearchClusterVersion?: string;
  themeDarkMode?: 'light' | 'dark';
  themeName?: string;
}

/**
 * Creates an InternalInjectedMetadataSetup for standalone packaging.
 * This allows Kibana plugins to run without the full Kibana server context.
 *
 * @param options - Configuration options to customize the metadata
 * @returns An InternalInjectedMetadataSetup implementation for standalone use
 *
 * @example
 * ```ts
 * const metadata = createInjectedMetadata({
 *   kibanaVersion: '8.12.0',
 *   kibanaBuildNumber: 54321,
 *   basePath: '/my-app',
 * });
 * ```
 */
export function createInjectedMetadata(
  options: InjectedMetadataOptions = {}
): InternalInjectedMetadataSetup {
  const {
    kibanaBranch = 'main',
    kibanaVersion = '9.1.0',
    kibanaBuildNumber = 12345,
    basePath = '',
    serverBasePath = '',
    publicBaseUrl = '',
    elasticsearchClusterUuid = 'test-cluster-uuid',
    elasticsearchClusterName = 'test-cluster-name',
    elasticsearchClusterVersion = '8.0.0',
    themeDarkMode = 'light',
    themeName = 'default',
  } = options;

  return {
    getKibanaBranch: () => kibanaBranch,
    getKibanaVersion: () => kibanaVersion,
    getKibanaBuildNumber: () => kibanaBuildNumber,
    getBasePath: () => basePath,
    getServerBasePath: () => serverBasePath,
    getPublicBaseUrl: () => publicBaseUrl,
    getElasticsearchInfo: () => ({
      cluster_uuid: elasticsearchClusterUuid,
      cluster_name: elasticsearchClusterName,
      cluster_version: elasticsearchClusterVersion,
      cluster_build_flavor: 'development',
    }),
    getCspConfig: () =>
      ({
        warnLegacyBrowsers: true,
      } as unknown),
    getTheme: () =>
      ({
        darkMode: themeDarkMode,
        name: themeName,
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
}
