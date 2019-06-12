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

import { Server } from '../server/kbn_server';
import { Capabilities } from '../../core/public';
import { SavedObjectsSchemaDefinition } from '../server/saved_objects/schema';

/**
 * Usage
 *
 * ```
 * const apmOss: LegacyPlugin = (kibana) => {
 *   return new kibana.Plugin({
 *     id: 'apm_oss',
 *     // ...
 *   });
 * };
 * ```
 */
export type LegacyPluginInitializer = (kibana: LegacyPluginApi) => ArrayOrItem<LegacyPluginSpec>;

export type ArrayOrItem<T> = T | T[];

export interface LegacyPluginApi {
  Plugin: new (options: Partial<LegacyPluginOptions>) => LegacyPluginSpec;
}

export interface LegacyPluginOptions {
  id: string;
  require: string[];
  version: string;
  kibanaVersion: 'kibana';
  uiExports: Partial<{
    app: Partial<{
      title: string;
      description: string;
      main: string;
      icon: string;
      euiIconType: string;
      order: number;
    }>;
    apps: any;
    hacks: string[];
    devTools: string[];
    styleSheetPaths: string;
    injectDefaultVars: (server: Server) => Record<string, any>;
    noParse: string[];
    home: string[];
    mappings: any;
    savedObjectSchemas: SavedObjectsSchemaDefinition;
    embeddableActions?: string[];
    embeddableFactories?: string[];
  }>;
  uiCapabilities?: Capabilities;
  publicDir: any;
  configPrefix: any;
  config: any;
  deprecations: any;
  preInit: any;
  init: InitPluginFunction;
  postInit: any;
  isEnabled: boolean;
}

export type InitPluginFunction = (server: Server) => void;

export interface LegacyPluginSpec {
  getPack(): any;
  getPkg(): any;
  getPath(): string;
  getId(): string;
  getVersion(): string;
  isEnabled(config: any): boolean;
  getExpectedKibanaVersion(): string;
  isVersionCompatible(actualKibanaVersion: any): boolean;
  getRequiredPluginIds(): string[];
  getPublicDir(): string | null;
  getExportSpecs(): any;
  getUiCapabilitiesProvider(): any;
  getPreInitHandler(): any;
  getInitHandler(): any;
  getPostInitHandler(): any;
  getConfigPrefix(): string;
  getConfigSchemaProvider(): any;
  readConfigValue(config: any, key: string): any;
  getDeprecationsProvider(): any;
}
