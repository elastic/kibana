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

import { Server } from '@hapi/hapi';

import {
  CoreSetup,
  CoreStart,
  EnvironmentMode,
  LoggerFactory,
  PackageInfo,
  LegacyServiceSetupDeps,
} from '../../core/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LegacyConfig } from '../../core/server/legacy';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { UiPlugins } from '../../core/server/plugins';

// lot of legacy code was assuming this type only had these two methods
export type KibanaConfig = Pick<LegacyConfig, 'get' | 'has'>;

// Extend the defaults with the plugins and server methods we need.
declare module 'hapi' {
  interface PluginProperties {
    spaces: any;
  }

  interface Server {
    config: () => KibanaConfig;
    logWithMetadata: (tags: string[], message: string, meta: Record<string, any>) => void;
    newPlatform: KbnServer['newPlatform'];
  }
}

type KbnMixinFunc = (kbnServer: KbnServer, server: Server, config: any) => Promise<any> | void;

export interface PluginsSetup {
  [key: string]: object;
}

export interface KibanaCore {
  __internals: {
    hapiServer: LegacyServiceSetupDeps['core']['http']['server'];
    rendering: LegacyServiceSetupDeps['core']['rendering'];
    uiPlugins: UiPlugins;
  };
  env: {
    mode: Readonly<EnvironmentMode>;
    packageInfo: Readonly<PackageInfo>;
  };
  setupDeps: {
    core: CoreSetup;
    plugins: PluginsSetup;
  };
  startDeps: {
    core: CoreStart;
    plugins: Record<string, object>;
  };
  logger: LoggerFactory;
}

export interface NewPlatform {
  __internals: KibanaCore['__internals'];
  env: KibanaCore['env'];
  coreContext: {
    logger: KibanaCore['logger'];
  };
  setup: KibanaCore['setupDeps'];
  start: KibanaCore['startDeps'];
  stop: null;
}

// eslint-disable-next-line import/no-default-export
export default class KbnServer {
  public readonly newPlatform: NewPlatform;
  public server: Server;
  public inject: Server['inject'];

  constructor(settings: Record<string, any>, config: KibanaConfig, core: KibanaCore);

  public ready(): Promise<void>;
  public mixin(...fns: KbnMixinFunc[]): Promise<void>;
  public listen(): Promise<Server>;
  public close(): Promise<void>;
  public applyLoggingConfiguration(settings: any): void;
  public config: KibanaConfig;
}

// Re-export commonly used hapi types.
export { Server, Request, ResponseToolkit } from '@hapi/hapi';
