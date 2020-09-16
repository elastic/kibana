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

import { KibanaRequest, LegacyRequest } from '../http';
import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { PluginsServiceSetup, PluginsServiceStart, UiPlugins } from '../plugins';
import { InternalRenderingServiceSetup } from '../rendering';

/**
 * @internal
 * @deprecated
 */
export type LegacyVars = Record<string, any>;

type LegacyCoreSetup = InternalCoreSetup & {
  plugins: PluginsServiceSetup;
  rendering: InternalRenderingServiceSetup;
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
 * @public
 * @deprecated
 */
export interface LegacyServiceSetupDeps {
  core: LegacyCoreSetup;
  plugins: Record<string, unknown>;
  uiPlugins: UiPlugins;
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
export interface LegacyServiceSetupConfig {
  legacyConfig: LegacyConfig;
  settings: LegacyVars;
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
  getVars(
    id: string,
    request: KibanaRequest | LegacyRequest,
    injected?: LegacyVars
  ): Promise<LegacyVars>;
}
