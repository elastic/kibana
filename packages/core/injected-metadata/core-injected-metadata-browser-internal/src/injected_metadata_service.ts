/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepFreeze } from '@kbn/std';
import type { InjectedMetadata } from '@kbn/core-injected-metadata-common-internal';
import type {
  InjectedMetadataParams,
  InternalInjectedMetadataSetup,
  InternalInjectedMetadataStart,
} from './types';

/**
 * Provides access to the metadata that is injected by the
 * server into the page. The metadata is actually defined
 * in the entry file for the bundle containing the new platform
 * and is read from the DOM in most cases.
 *
 * @internal
 */
export class InjectedMetadataService {
  private state: InjectedMetadata;

  constructor(private readonly params: InjectedMetadataParams) {
    this.state = deepFreeze(this.params.injectedMetadata) as InjectedMetadata;
  }

  public start(): InternalInjectedMetadataSetup {
    return this.setup();
  }

  public setup(): InternalInjectedMetadataStart {
    return {
      getBasePath: () => {
        return this.state.basePath;
      },

      getServerBasePath: () => {
        return this.state.serverBasePath;
      },

      getPublicBaseUrl: () => {
        return this.state.publicBaseUrl;
      },

      getAssetsHrefBase: () => {
        return this.state.assetsHrefBase;
      },

      getAnonymousStatusPage: () => {
        return this.state.anonymousStatusPage;
      },

      getKibanaVersion: () => {
        return this.state.version;
      },

      getCspConfig: () => {
        return this.state.csp;
      },

      getExternalUrlConfig: () => {
        return this.state.externalUrl;
      },

      getPlugins: () => {
        return this.state.uiPlugins;
      },

      getLegacyMetadata: () => {
        return this.state.legacyMetadata;
      },

      getKibanaBuildNumber: () => {
        return this.state.buildNumber;
      },

      getKibanaBranch: () => {
        return this.state.branch;
      },

      getTheme: () => {
        return this.state.theme;
      },

      getElasticsearchInfo: () => {
        return this.state.clusterInfo;
      },

      getCustomBranding: () => {
        return this.state.customBranding;
      },

      getFeatureFlags: () => {
        return this.state.featureFlags;
      },
    };
  }
}
