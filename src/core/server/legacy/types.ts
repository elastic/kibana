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

/**
 * @internal
 * @deprecated
 */
export type LegacyVars = Record<string, any>;

type LegacyCoreSetup = InternalCoreSetup & {
  plugins: PluginsServiceSetup;
  rendering: RenderingServiceSetup;
};
type LegacyCoreStart = InternalCoreStart & { plugins: PluginsServiceStart };

/**
 * New platform representation of the legacy configuration (KibanaConfig)
 *
 * @internal
 * @deprecated
 */
export interface LegacyConfig {
  get<T>(key?: string): T;
  has(key: string): boolean;
  set(key: string, value: any): void;
  set(config: LegacyVars): void;
}

/**
 * Representation of a legacy configuration deprecation factory used for
 * legacy plugin deprecations.
 *
 * @internal
 * @deprecated
 */
export interface LegacyConfigDeprecationFactory {
  rename(oldKey: string, newKey: string): LegacyConfigDeprecation;
  unused(unusedKey: string): LegacyConfigDeprecation;
}

/**
 * Representation of a legacy configuration deprecation.
 *
 * @internal
 * @deprecated
 */
export type LegacyConfigDeprecation = (settings: LegacyVars, log: (msg: string) => void) => void;

/**
 * Representation of a legacy configuration deprecation provider.
 *
 * @internal
 * @deprecated
 */
export type LegacyConfigDeprecationProvider = (
  factory: LegacyConfigDeprecationFactory
) => LegacyConfigDeprecation[] | Promise<LegacyConfigDeprecation[]>;

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
  fn: (server: Server, configValue: any) => LegacyVars;
  pluginSpec: {
    readConfigValue(config: any, key: string | string[]): any;
  };
}

/**
 * @internal
 * @deprecated
 */
export type VarsInjector = () => LegacyVars;

/**
 * @internal
 * @deprecated
 */
export type VarsReplacer = (
  vars: LegacyVars,
  request: LegacyRequest,
  server: Server
) => LegacyVars | Promise<LegacyVars>;

/**
 * @internal
 * @deprecated
 */
export type LegacyNavLinkSpec = Record<string, unknown> & ChromeNavLink;

/**
 * @internal
 * @deprecated
 */
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
  navLinkSpecs?: LegacyNavLinkSpec[] | null;
  uiAppSpecs?: Array<LegacyAppSpec | undefined>;
  unknown?: [{ pluginSpec: { getId: () => unknown }; type: unknown }];
};

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceSetupDeps {
  core: LegacyCoreSetup;
  plugins: Record<string, unknown>;
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceStartDeps {
  core: LegacyCoreStart;
  plugins: Record<string, unknown>;
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
  getInjectedUiAppVars(id: string): Promise<LegacyVars>;

  /**
   * Get the metadata vars for a particular plugin
   */
  getVars(id: string, request: LegacyRequest, injected?: LegacyVars): Promise<LegacyVars>;
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
  settings: LegacyVars;
}
