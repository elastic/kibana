/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
