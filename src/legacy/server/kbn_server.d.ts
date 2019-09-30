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

import { SavedObjectsClientProviderOptions } from 'src/core/server';
import {
  ConfigService,
  ElasticsearchServiceSetup,
  LoggerFactory,
  SavedObjectsClientContract,
  SavedObjectsService,
} from '../../core/server';

import { LegacyServiceSetupDeps, LegacyServiceStartDeps } from '../../core/server/';
// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsManagement } from '../../core/server/saved_objects/management';
import { ApmOssPlugin } from '../core_plugins/apm_oss';
import { CallClusterWithRequest, ElasticsearchPlugin } from '../core_plugins/elasticsearch';

import { CapabilitiesModifier } from './capabilities';
import { IndexPatternsServiceFactory } from './index_patterns';
import { Capabilities } from '../../core/public';
import { IUiSettingsService } from '../../legacy/ui/ui_settings/ui_settings_service';

export interface KibanaConfig {
  get<T>(key: string): T;
  has(key: string): boolean;
}

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
    savedObjects: SavedObjectsService;
    usage: { collectorSet: any };
    injectUiAppVars: (pluginName: string, getAppVars: () => { [key: string]: any }) => void;
    getHiddenUiAppById(appId: string): UiApp;
    registerCapabilitiesModifier: (provider: CapabilitiesModifier) => void;
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
    uiSettingsServiceFactory: (options: any) => any;
  }

  interface Request {
    getSavedObjectsClient(options?: SavedObjectsClientProviderOptions): SavedObjectsClientContract;
    getBasePath(): string;
    getUiSettingsService(): IUiSettingsService;
    getCapabilities(): Promise<Capabilities>;
  }

  interface ResponseToolkit {
    renderAppWithDefaultConfig(app: UiApp): ResponseObject;
  }
}

type KbnMixinFunc = (kbnServer: KbnServer, server: Server, config: any) => Promise<any> | void;

// eslint-disable-next-line import/no-default-export
export default class KbnServer {
  public readonly newPlatform: {
    coreContext: {
      logger: LoggerFactory;
    };
    setup: LegacyServiceSetupDeps;
    start: LegacyServiceStartDeps;
    stop: null;
    params: {
      handledConfigPaths: UnwrapPromise<ReturnType<ConfigService['getUsedPaths']>>;
    };
  };
  public server: Server;
  public inject: Server['inject'];
  public pluginSpecs: any[];

  constructor(settings: any, core: any);

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
export { IndexPatternsService } from './index_patterns';
export { SavedObjectsService, SavedObjectsClient } from 'src/core/server';
