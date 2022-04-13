/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { deepFreeze } from '@kbn/std';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import { DiscoveredPlugin, PluginName } from '../../server';
import {
  EnvironmentMode,
  IExternalUrlPolicy,
  PackageInfo,
  UiSettingsParams,
  UserProvidedValues,
} from '../../server/types';
import { AppCategory } from '../';

export interface InjectedPluginMetadata {
  id: PluginName;
  plugin: DiscoveredPlugin;
  config?: {
    [key: string]: unknown;
  };
}

/** @internal */
export interface InjectedMetadataParams {
  injectedMetadata: {
    version: string;
    buildNumber: number;
    branch: string;
    basePath: string;
    serverBasePath: string;
    publicBaseUrl: string;
    category?: AppCategory;
    csp: {
      warnLegacyBrowsers: boolean;
    };
    externalUrl: {
      policy: IExternalUrlPolicy[];
    };
    vars: {
      [key: string]: unknown;
    };
    theme: {
      darkMode: boolean;
      version: ThemeVersion;
    };
    env: {
      mode: Readonly<EnvironmentMode>;
      packageInfo: Readonly<PackageInfo>;
    };
    uiPlugins: InjectedPluginMetadata[];
    anonymousStatusPage: boolean;
    legacyMetadata: {
      uiSettings: {
        defaults: Record<string, UiSettingsParams>;
        user?: Record<string, UserProvidedValues>;
      };
    };
  };
}

/**
 * Provides access to the metadata that is injected by the
 * server into the page. The metadata is actually defined
 * in the entry file for the bundle containing the new platform
 * and is read from the DOM in most cases.
 *
 * @internal
 */
export class InjectedMetadataService {
  private state: InjectedMetadataParams['injectedMetadata'];

  constructor(private readonly params: InjectedMetadataParams) {
    this.state = deepFreeze(
      this.params.injectedMetadata
    ) as InjectedMetadataParams['injectedMetadata'];
  }

  public start(): InjectedMetadataStart {
    return this.setup();
  }

  public setup(): InjectedMetadataSetup {
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

      getInjectedVar: (name: string, defaultValue?: any): unknown => {
        return get(this.state.vars, name, defaultValue);
      },

      getInjectedVars: () => {
        return this.state.vars;
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
    };
  }
}

/**
 * Provides access to the metadata injected by the server into the page
 *
 * @internal
 */
export interface InjectedMetadataSetup {
  getBasePath: () => string;
  getServerBasePath: () => string;
  getPublicBaseUrl: () => string;
  getKibanaBuildNumber: () => number;
  getKibanaBranch: () => string;
  getKibanaVersion: () => string;
  getCspConfig: () => {
    warnLegacyBrowsers: boolean;
  };
  getExternalUrlConfig: () => {
    policy: IExternalUrlPolicy[];
  };
  getTheme: () => {
    darkMode: boolean;
    version: ThemeVersion;
  };
  /**
   * An array of frontend plugins in topological order.
   */
  getPlugins: () => InjectedPluginMetadata[];
  getAnonymousStatusPage: () => boolean;
  getLegacyMetadata: () => {
    uiSettings: {
      defaults: Record<string, UiSettingsParams>;
      user?: Record<string, UserProvidedValues> | undefined;
    };
  };
  getInjectedVar: (name: string, defaultValue?: any) => unknown;
  getInjectedVars: () => {
    [key: string]: unknown;
  };
}

/** @internal */
export type InjectedMetadataStart = InjectedMetadataSetup;
