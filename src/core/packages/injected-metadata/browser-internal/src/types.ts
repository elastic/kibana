/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  InjectedMetadata,
  InjectedMetadataClusterInfo,
  InjectedMetadataExternalUrlPolicy,
  InjectedMetadataPlugin,
  InjectedMetadataTheme,
} from '@kbn/core-injected-metadata-common-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

/** @internal */
export interface InjectedMetadataParams {
  injectedMetadata: InjectedMetadata;
}

/**
 * Provides access to the metadata injected by the server into the page
 *
 * @internal
 */
export interface InternalInjectedMetadataSetup {
  getBasePath: () => string;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getPublicBaseUrl: () => string | undefined;
  getAssetsHrefBase: () => string;
  getKibanaBuildNumber: () => number;
  getKibanaBranch: () => string;
  getKibanaVersion: () => string;
  getCspConfig: () => {
    warnLegacyBrowsers: boolean;
  };
  getExternalUrlConfig: () => {
    policy: InjectedMetadataExternalUrlPolicy[];
  };
  getTheme: () => InjectedMetadataTheme;
  getElasticsearchInfo: () => InjectedMetadataClusterInfo;
  /** Returns the display-language values injected at render time for EBT context. */
  getI18nInfo: () => {
    /** The locale Kibana rendered this page in. */
    locale: string;
    /** Accept-Language resolved to a servable Kibana locale id. Undefined when nothing the browser asked for can be served. */
    browserPreferredLocale: string | undefined;
    /** True when `i18n.defaultLocale` is set to anything other than `en`. */
    configOverride: boolean;
  };
  /**
   * An array of frontend plugins in topological order.
   */
  getPlugins: () => InjectedMetadataPlugin[];
  getAnonymousStatusPage: () => boolean;
  getLegacyMetadata: () => {
    uiSettings: {
      defaults: Record<string, any>;
      user?: Record<string, any> | undefined;
    };
    globalUiSettings: {
      defaults: Record<string, any>;
      user?: Record<string, any> | undefined;
    };
  };
  getCustomBranding: () => CustomBranding;
  getFeatureFlags: () =>
    | {
        overrides: Record<string, unknown>;
        initialFeatureFlags: Record<string, unknown>;
      }
    | undefined;
  getUserStorage: () => {
    available: boolean;
    values: Record<string, unknown>;
  };
}

/** @internal */
export type InternalInjectedMetadataStart = InternalInjectedMetadataSetup;
