/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Server } from 'hapi';

import { ChromeNavLink } from '../../public';
import { LegacyRequest } from '../http';
import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { PluginsServiceSetup, PluginsServiceStart } from '../plugins';
import { RenderingServiceSetup } from '../rendering';
import { SavedObjectsLegacyUiExports } from '../types';
import { LegacyConfig, LegacyConfigDeprecationProvider } from './config';

type Spec = Record<string, unknown>;
type LegacyCoreSetup = InternalCoreSetup & {
  plugins: PluginsServiceSetup;
  rendering: RenderingServiceSetup;
};
type LegacyCoreStart = InternalCoreStart & { plugins: PluginsServiceStart };

export type Vars = Record<string, any>;

/**
 * @internal
 * @deprecated
 */
export interface LegacyPluginPack {
  getPath(): string;
}

/**
 * @internal
 * @deprecated
 */
export interface LegacyPluginSpec {
  getId: () => unknown;
  getExpectedKibanaVersion: () => string;
  getConfigPrefix: () => string;
  getDeprecationsProvider: () => LegacyConfigDeprecationProvider | undefined;
}

/**
 * @internal
 * @deprecated
 */
export interface VarsProvider {
  fn: (server: Server, configValue: any) => Vars;
  pluginSpec: {
    readConfigValue(config: any, key: string | string[]): any;
  };
}

/**
 * @internal
 * @deprecated
 */
export type VarsInjector = (server: Server) => Vars | Promise<Vars>;

/**
 * @internal
 * @deprecated
 */
export type VarsReplacer = (
  vars: Vars,
  request: LegacyRequest,
  server: Server
) => Vars | Promise<Vars>;

/**
 * @internal
 * @deprecated
 */
export type LegacyNavLinkSpec = Spec & ChromeNavLink;

export type LegacyAppSpec = Pick<
  ChromeNavLink,
  'title' | 'order' | 'icon' | 'euiIconType' | 'url' | 'linkToLastSubUrl' | 'hidden'
> & { pluginId?: string; id?: string; listed?: boolean };

/**
 * @internal
 * @deprecated
 */
export type LegacyNavLink = Omit<ChromeNavLink, 'baseUrl' | 'legacy' | 'order'> & {
  order: number;
};

/**
 * @internal
 * @deprecated
 */
export type LegacyUiExports = SavedObjectsLegacyUiExports & {
  defaultInjectedVarProviders?: VarsProvider[];
  injectedVarsReplacers?: VarsReplacer[];
  navLinkSpecs?: LegacyNavLinkSpec[];
  uiAppSpecs?: Array<LegacyAppSpec | undefined>;
  unknown?: [{ pluginSpec: { getId: () => unknown }; type: unknown }];
};

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceSetupDeps {
  core: LegacyCoreSetup;
  plugins: Spec;
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceStartDeps {
  core: LegacyCoreStart;
  plugins: Spec;
}

/**
 * @internal
 * @deprecated
 */
export interface ILegacyInternals {
  /**
   * Inject UI app vars for a particular plugin
   */
  injectUiAppVars(id: string, injector: VarsInjector): void;

  /**
   * Get all the merged injected UI app vars for a particular plugin
   */
  getInjectedUiAppVars(id: string): Promise<Vars>;

  /**
   * Get the metadata vars for a particular plugin
   */
  getVars(id: string, request: LegacyRequest, injected?: Vars): Promise<Vars>;
}

/**
 * @internal
 * @deprecated
 */
export interface LegacyPlugins {
  disabledPluginSpecs: LegacyPluginSpec[];
  pluginSpecs: LegacyPluginSpec[];
  uiExports: LegacyUiExports;
  navLinks: LegacyNavLink[];
}

/**
 * @internal
 * @deprecated
 */
export interface LegacyServiceDiscoverPlugins extends LegacyPlugins {
  pluginExtendedConfig: LegacyConfig;
  settings: Vars;
}
