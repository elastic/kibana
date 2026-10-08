/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName, DiscoveredPlugin } from '@kbn/core-base-common';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { EnvironmentMode, PackageInfo } from '@kbn/config';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { DarkModeValue, ThemeName } from '@kbn/core-ui-settings-common';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';

/** @internal */
export interface InjectedMetadataClusterInfo {
  cluster_uuid?: string;
  cluster_name?: string;
  cluster_version?: string;
  cluster_build_flavor?: string;
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

/**
 * Which step of the locale resolution chain determined the rendered locale.
 * @internal
 */
export type LocaleSource = 'profile' | 'cookie' | 'config' | 'browser' | 'default';

/**
 * Display-language values resolved at render time and surfaced to EBT as context.
 * @internal
 */
export interface InjectedMetadataDisplayLanguage {
  /** The locale Kibana rendered this page in. */
  locale: string;
  /**
   * The normalized locale the browser's Accept-Language header resolves to.
   * Absent when the browser's preference cannot be served.
   */
  browserPreferredLocale?: string;
  /** Which step of the resolution chain produced {@link locale}. */
  localeSource: LocaleSource;
  /** The deployment's configured `i18n.defaultLocale`. */
  configDefaultLocale: string;
}

/** @internal */
export interface InjectedMetadataTheme {
  darkMode: DarkModeValue;
  name: ThemeName;
  version: ThemeVersion;
  stylesheetPaths: {
    default: string[];
    dark: string[];
  };
}

/** @internal */
export interface InjectedMetadata {
  version: string;
  buildNumber: number;
  branch: string;
  basePath: string;
  serverBasePath: string;
  spaceId: string;
  publicBaseUrl?: string;
  assetsHrefBase: string;
  clusterInfo: InjectedMetadataClusterInfo;
  logging: BrowserLoggingConfig;
  env: {
    mode: EnvironmentMode;
    packageInfo: PackageInfo;
    airgapped: boolean;
    isCoreRenderingInReactConcurrentMode: boolean;
  };
  featureFlags?: {
    overrides: Record<string, unknown>;
    initialFeatureFlags: Record<string, unknown>;
  };
  anonymousStatusPage: boolean;
  i18n: InjectedMetadataDisplayLanguage & {
    /** `null` when the effective locale is English — no fetch is needed. */
    translationsUrl: string | null;
    availableLocales: Array<{ id: string; label: string }>;
  };
  theme: InjectedMetadataTheme;
  csp: {
    warnLegacyBrowsers: boolean;
  };
  externalUrl: { policy: InjectedMetadataExternalUrlPolicy[] };
  apmConfig: Record<string, unknown> | null;
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
  userStorage: {
    values: Record<string, unknown>;
  };
}
