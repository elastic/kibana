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

import {
  ElasticsearchServiceSetup,
  ConfigService,
  LoggerFactory,
  InternalCoreSetup,
  InternalCoreStart,
} from '../../core/server';
import { ApmOssPlugin } from '../core_plugins/apm_oss';
import { CallClusterWithRequest, ElasticsearchPlugin } from '../core_plugins/elasticsearch';

import { CapabilitiesModifier } from './capabilities';
import { IndexPatternsServiceFactory } from './index_patterns';
import {
  SavedObjectsClient,
  SavedObjectsService,
  SavedObjectsSchema,
  SavedObjectsManagement,
} from './saved_objects';
import { Capabilities } from '../../core/public';

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
  }

  interface Request {
    getSavedObjectsClient(): SavedObjectsClient;
    getBasePath(): string;
    getUiSettingsService(): any;
    getCapabilities(): Promise<Capabilities>;
  }

  interface ResponseToolkit {
    renderAppWithDefaultConfig(app: UiApp): ResponseObject;
  }
}

type KbnMixinFunc = (kbnServer: KbnServer, server: Server, config: any) => Promise<any> | void;
type Unpromise<T> = T extends Promise<infer U> ? U : T;
// eslint-disable-next-line import/no-default-export
export default class KbnServer {
  public readonly newPlatform: {
    coreContext: {
      logger: LoggerFactory;
    };
    setup: {
      core: InternalCoreSetup;
      plugins: Record<string, unknown>;
    };
    start: {
      core: InternalCoreStart;
      plugins: Record<string, unknown>;
    };
    stop: null;
    params: {
      serverOptions: ElasticsearchServiceSetup;
      handledConfigPaths: Unpromise<ReturnType<ConfigService['getUsedPaths']>>;
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
}

// Re-export commonly used hapi types.
export { Server, Request, ResponseToolkit } from 'hapi';

// Re-export commonly accessed api types.
export { IndexPatternsService } from './index_patterns';
export { SavedObject, SavedObjectsClient, SavedObjectsService } from './saved_objects';
