/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
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
}

/** @internal */
export type InternalInjectedMetadataStart = InternalInjectedMetadataSetup;
