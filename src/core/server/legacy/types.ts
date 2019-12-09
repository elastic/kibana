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

import { InternalHttpServiceSetup, LegacyRequest } from '../http';
import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { PluginsServiceSetup, PluginsServiceStart } from '../plugins';
import { RenderingServiceSetup } from '../rendering';
import { SavedObjectsLegacyUiExports } from '../types';
import { LegacyPluginSpec } from './plugins/find_legacy_plugin_specs';
import { LegacyConfig } from './config';

type Vars = Record<string, any>;
type Spec = Record<string, unknown>;
type MaybeSpec = Spec | undefined;
type LegacyCoreSetup = InternalCoreSetup & {
  plugins: PluginsServiceSetup;
  rendering: RenderingServiceSetup;
};
type LegacyCoreStart = InternalCoreStart & { plugins: PluginsServiceStart };

/**
 * @internal
 * @deprecated
 */
export interface VarsProvider {
  fn: (server: Server, options: any) => Vars;
  pluginSpec: {
    readConfigValue(config: any, key: string | string[]): any;
  };
}

/**
 * @internal
 * @deprecated
 */
export type VarsInjector = (server: Server) => Promise<Vars>;

/**
 * @internal
 * @deprecated
 */
export type VarsReplacer = (
  vars: Vars,
  request: LegacyRequest,
  server: InternalHttpServiceSetup['server']
) => Promise<Vars>;

/**
 * @internal
 * @deprecated
 */
export type LegacyUiExports = SavedObjectsLegacyUiExports & {
  defaultInjectedVarProviders?: VarsProvider[];
  injectedVarsReplacers?: VarsReplacer[];
  navLinkSpecs?: Spec[];
  uiAppSpecs?: MaybeSpec[];
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
export interface LegacyServiceDiscoverPlugins {
  disabledPluginSpecs: LegacyPluginSpec[];
  navLinks: Spec[];
  pluginExtendedConfig: LegacyConfig;
  pluginSpecs: LegacyPluginSpec[];
  settings: Vars;
  uiExports: LegacyUiExports;
}
