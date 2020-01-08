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

import { ResponseObject, Server } from 'hapi';
import { UnwrapPromise } from '@kbn/utility-types';

import {
  ConfigService,
  CoreSetup,
  CoreStart,
  ElasticsearchServiceSetup,
  EnvironmentMode,
  LoggerFactory,
  SavedObjectsClientContract,
  SavedObjectsLegacyService,
  SavedObjectsClientProviderOptions,
  IUiSettingsClient,
  PackageInfo,
  LegacyRequest,
  LegacyServiceSetupDeps,
  LegacyServiceStartDeps,
  LegacyServiceDiscoverPlugins,
} from '../../core/server';

// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsManagement } from '../../core/server/saved_objects/management';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LegacyConfig, ILegacyService, ILegacyInternals } from '../../core/server/legacy';
import { ApmOssPlugin } from '../core_plugins/apm_oss';
import { CallClusterWithRequest, ElasticsearchPlugin } from '../core_plugins/elasticsearch';
import { UsageCollectionSetup } from '../../plugins/usage_collection/server';
import { IndexPatternsServiceFactory } from './index_patterns';
import { Capabilities } from '../../core/server';
import { UiSettingsServiceFactoryOptions } from '../../legacy/ui/ui_settings/ui_settings_service_factory';
import { HomeServerPluginSetup } from '../../plugins/home/server';

// lot of legacy code was assuming this type only had these two methods
export type KibanaConfig = Pick<LegacyConfig, 'get' | 'has'>;

export interface UiApp {
  getId(): string;
}

// Extend the defaults with the plugins and server methods we need.
declare module 'hapi' {
  interface PluginProperties {
    elasticsearch: ElasticsearchPlugin;
    kibana: any;
    spaces: any;
    apm_oss: ApmOssPlugin;
    // add new plugin types here
  }

  interface Server {
    config: () => KibanaConfig;
    indexPatternsServiceFactory: IndexPatternsServiceFactory;
    savedObjects: SavedObjectsLegacyService;
    injectUiAppVars: (pluginName: string, getAppVars: () => { [key: string]: any }) => void;
    getHiddenUiAppById(appId: string): UiApp;
    addScopedTutorialContextFactory: (
      scopedTutorialContextFactory: (...args: any[]) => any
    ) => void;
    savedObjectsManagement(): SavedObjectsManagement;
    getInjectedUiAppVars: (pluginName: string) => { [key: string]: any };
    getUiNavLinks(): Array<{ _id: string }>;
    addMemoizedFactoryToRequest: (
      name: string,
      factoryFn: (request: Request) => Record<string, any>
    ) => void;
    uiSettingsServiceFactory: (options?: UiSettingsServiceFactoryOptions) => IUiSettingsClient;
    logWithMetadata: (tags: string[], message: string, meta: Record<string, any>) => void;
    newPlatform: KbnServer['newPlatform'];
  }

  interface Request {
    getSavedObjectsClient(options?: SavedObjectsClientProviderOptions): SavedObjectsClientContract;
    getBasePath(): string;
    getDefaultRoute(): Promise<string>;
    getUiSettingsService(): IUiSettingsClient;
  }

  interface ResponseToolkit {
    renderAppWithDefaultConfig(app: UiApp): ResponseObject;
  }
}

type KbnMixinFunc = (kbnServer: KbnServer, server: Server, config: any) => Promise<any> | void;

export interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
  home: HomeServerPluginSetup;
  [key: string]: object;
}

export interface KibanaCore {
  __internals: {
    elasticsearch: LegacyServiceSetupDeps['core']['elasticsearch'];
    hapiServer: LegacyServiceSetupDeps['core']['http']['server'];
    kibanaMigrator: LegacyServiceStartDeps['core']['savedObjects']['migrator'];
    legacy: ILegacyInternals;
    rendering: LegacyServiceSetupDeps['core']['rendering'];
    uiPlugins: LegacyServiceSetupDeps['core']['plugins']['uiPlugins'];
    uiSettings: LegacyServiceSetupDeps['core']['uiSettings'];
    savedObjectsClientProvider: LegacyServiceStartDeps['core']['savedObjects']['clientProvider'];
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
    core: CoreSetup;
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

export type LegacyPlugins = Pick<
  LegacyServiceDiscoverPlugins,
  'pluginSpecs' | 'disabledPluginSpecs' | 'uiExports'
>;

// eslint-disable-next-line import/no-default-export
export default class KbnServer {
  public readonly newPlatform: NewPlatform;
  public server: Server;
  public inject: Server['inject'];
  public pluginSpecs: any[];

  constructor(
    settings: Record<string, any>,
    config: KibanaConfig,
    core: KibanaCore,
    legacyPlugins: LegacyPlugins
  );

  public ready(): Promise<void>;
  public mixin(...fns: KbnMixinFunc[]): Promise<void>;
  public listen(): Promise<Server>;
  public close(): Promise<void>;
  public afterPluginsInit(callback: () => void): void;
  public applyLoggingConfiguration(settings: any): void;
  public config: KibanaConfig;
}

// Re-export commonly used hapi types.
export { Server, Request, ResponseToolkit } from 'hapi';

// Re-export commonly accessed api types.
export { IndexPatternsFetcher as IndexPatternsService } from './index_patterns';
export { SavedObjectsLegacyService, SavedObjectsClient } from 'src/core/server';
