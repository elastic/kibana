/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginName, DiscoveredPlugin } from '@kbn/core-base-common';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { EnvironmentMode, PackageInfo } from '@kbn/config';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

/** @internal */
export interface InjectedMetadataClusterInfo {
  cluster_uuid?: string;
  cluster_name?: string;
  cluster_version?: string;
}

/** @internal */
export interface InjectedMetadataPlugin {
  id: PluginName;
  plugin: DiscoveredPlugin;
  config?: {
    [key: string]: unknown;
  };
}

/** @internal */
export interface InjectedMetadataExternalUrlPolicy {
  allow: boolean;
  host?: string;
  protocol?: string;
}

/** @internal */
export interface InjectedMetadata {
  version: string;
  buildNumber: number;
  branch: string;
  basePath: string;
  serverBasePath: string;
  publicBaseUrl?: string;
  clusterInfo: InjectedMetadataClusterInfo;
  env: {
    mode: EnvironmentMode;
    packageInfo: PackageInfo;
  };
  anonymousStatusPage: boolean;
  i18n: {
    translationsUrl: string;
  };
  theme: {
    darkMode: boolean;
    version: ThemeVersion;
  };
  csp: {
    warnLegacyBrowsers: boolean;
  };
  externalUrl: { policy: InjectedMetadataExternalUrlPolicy[] };
  vars: Record<string, any>;
  uiPlugins: InjectedMetadataPlugin[];
  legacyMetadata: {
    uiSettings: {
      defaults: Record<string, any>; // unreferencing UiSettingsParams here
      user: Record<string, any>; // unreferencing UserProvidedValues here
    };
    globalUiSettings: {
      defaults: Record<string, any>; // unreferencing UiSettingsParams here
      user: Record<string, any>; // unreferencing UserProvidedValues here
    };
  };
  customBranding: Pick<CustomBranding, 'logo' | 'customizedLogo' | 'pageTitle'>;
}
