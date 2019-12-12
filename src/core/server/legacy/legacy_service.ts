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

import { combineLatest, ConnectableObservable, EMPTY, Observable, Subscription } from 'rxjs';
import { first, map, publishReplay, tap } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreSetup, CoreStart } from '../';
import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { SavedObjectsLegacyUiExports } from '../types';
import { Config } from '../config';
import { CoreContext } from '../core_context';
import { DevConfig, DevConfigType } from '../dev';
import { BasePathProxyServer, HttpConfig, HttpConfigType } from '../http';
import { Logger } from '../logging';
import { PluginsServiceSetup, PluginsServiceStart } from '../plugins';
import { findLegacyPluginSpecs } from './plugins';
import { LegacyPluginSpec } from './plugins/find_legacy_plugin_specs';
import { PathConfigType } from '../path';
import { LegacyConfig } from './config';

interface LegacyKbnServer {
  applyLoggingConfiguration: (settings: Readonly<Record<string, any>>) => void;
  listen: () => Promise<void>;
  ready: () => Promise<void>;
  close: () => Promise<void>;
}

function getLegacyRawConfig(config: Config, pathConfig: PathConfigType) {
  const rawConfig = config.toRaw();

  // Elasticsearch config is solely handled by the core and legacy platform
  // shouldn't have direct access to it.
  if (rawConfig.elasticsearch !== undefined) {
    delete rawConfig.elasticsearch;
  }

  return {
    ...rawConfig,
    path: pathConfig, // We rely heavily in the default value of 'path.data' in the legacy world and, since it has been moved to NP, it won't show up in RawConfig
  };
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceSetupDeps {
  core: InternalCoreSetup & {
    plugins: PluginsServiceSetup;
  };
  plugins: Record<string, unknown>;
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceStartDeps {
  core: InternalCoreStart & {
    plugins: PluginsServiceStart;
  };
  plugins: Record<string, unknown>;
}

/** @internal */
export interface LegacyServiceDiscoverPlugins {
  pluginSpecs: LegacyPluginSpec[];
  disabledPluginSpecs: LegacyPluginSpec[];
  uiExports: SavedObjectsLegacyUiExports;
  pluginExtendedConfig: LegacyConfig;
  settings: Record<string, any>;
}

/** @internal */
export type ILegacyService = Pick<LegacyService, keyof LegacyService>;

/** @internal */
export class LegacyService implements CoreService {
  /** Symbol to represent the legacy platform as a fake "plugin". Used by the ContextService */
  public readonly legacyId = Symbol();
  private readonly log: Logger;
  private readonly devConfig$: Observable<DevConfig>;
  private readonly httpConfig$: Observable<HttpConfig>;
  private kbnServer?: LegacyKbnServer;
  private configSubscription?: Subscription;
  private setupDeps?: LegacyServiceSetupDeps;
  private update$: ConnectableObservable<[Config, PathConfigType]> | undefined;
  private legacyRawConfig: LegacyConfig | undefined;
  private legacyPlugins:
    | {
        pluginSpecs: LegacyPluginSpec[];
        disabledPluginSpecs: LegacyPluginSpec[];
        uiExports: SavedObjectsLegacyUiExports;
      }
    | undefined;
  private settings: Record<string, any> | undefined;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('legacy-service');
    this.devConfig$ = coreContext.configService
      .atPath<DevConfigType>('dev')
      .pipe(map(rawConfig => new DevConfig(rawConfig)));
    this.httpConfig$ = coreContext.configService
      .atPath<HttpConfigType>('server')
      .pipe(map(rawConfig => new HttpConfig(rawConfig, coreContext.env)));
  }

  public async discoverPlugins(): Promise<LegacyServiceDiscoverPlugins> {
    this.update$ = combineLatest(
      this.coreContext.configService.getConfig$(),
      this.coreContext.configService.atPath<PathConfigType>('path')
    ).pipe(
      tap(([config, pathConfig]) => {
        if (this.kbnServer !== undefined) {
          this.kbnServer.applyLoggingConfiguration(getLegacyRawConfig(config, pathConfig));
        }
      }),
      tap({ error: err => this.log.error(err) }),
      publishReplay(1)
    ) as ConnectableObservable<[Config, PathConfigType]>;

    this.configSubscription = this.update$.connect();

    this.settings = await this.update$
      .pipe(
        first(),
        map(([config, pathConfig]) => getLegacyRawConfig(config, pathConfig))
      )
      .toPromise();

    const {
      pluginSpecs,
      pluginExtendedConfig,
      disabledPluginSpecs,
      uiExports,
    } = await findLegacyPluginSpecs(this.settings, this.coreContext.logger);

    this.legacyPlugins = {
      pluginSpecs,
      disabledPluginSpecs,
      uiExports,
    };

    this.legacyRawConfig = pluginExtendedConfig;

    // check for unknown uiExport types
    if (uiExports.unknown && uiExports.unknown.length > 0) {
      throw new Error(
        `Unknown uiExport types: ${uiExports.unknown
          .map(({ pluginSpec, type }) => `${type} from ${pluginSpec.getId()}`)
          .join(', ')}`
      );
    }

    return {
      pluginSpecs,
      disabledPluginSpecs,
      uiExports,
      pluginExtendedConfig,
      settings: this.settings,
    };
  }

  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.log.debug('setting up legacy service');
    if (!this.legacyRawConfig || !this.legacyPlugins || !this.settings) {
      throw new Error(
        'Legacy service has not discovered legacy plugins yet. Ensure LegacyService.discoverPlugins() is called before LegacyService.setup()'
      );
    }
    this.setupDeps = setupDeps;
  }

  public async start(startDeps: LegacyServiceStartDeps) {
    const { setupDeps } = this;
    if (!setupDeps || !this.legacyRawConfig || !this.legacyPlugins || !this.settings) {
      throw new Error('Legacy service is not setup yet.');
    }
    this.log.debug('starting legacy service');

    // Receive initial config and create kbnServer/ClusterManager.

    if (this.coreContext.env.isDevClusterMaster) {
      await this.createClusterManager(this.legacyRawConfig);
    } else {
      this.kbnServer = await this.createKbnServer(
        this.settings,
        this.legacyRawConfig,
        setupDeps,
        startDeps,
        this.legacyPlugins
      );
    }
  }

  public async stop() {
    this.log.debug('stopping legacy service');

    if (this.configSubscription !== undefined) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }

    if (this.kbnServer !== undefined) {
      await this.kbnServer.close();
      this.kbnServer = undefined;
    }
  }

  private async createClusterManager(config: LegacyConfig) {
    const basePathProxy$ = this.coreContext.env.cliArgs.basePath
      ? combineLatest(this.devConfig$, this.httpConfig$).pipe(
          first(),
          map(
            ([devConfig, httpConfig]) =>
              new BasePathProxyServer(this.coreContext.logger.get('server'), httpConfig, devConfig)
          )
        )
      : EMPTY;

    require('../../../cli/cluster/cluster_manager').create(
      this.coreContext.env.cliArgs,
      config,
      await basePathProxy$.toPromise()
    );
  }

  private async createKbnServer(
    settings: Record<string, any>,
    config: LegacyConfig,
    setupDeps: LegacyServiceSetupDeps,
    startDeps: LegacyServiceStartDeps,
    legacyPlugins: {
      pluginSpecs: LegacyPluginSpec[];
      disabledPluginSpecs: LegacyPluginSpec[];
      uiExports: SavedObjectsLegacyUiExports;
    }
  ) {
    const coreSetup: CoreSetup = {
      capabilities: setupDeps.core.capabilities,
      context: setupDeps.core.context,
      elasticsearch: {
        adminClient$: setupDeps.core.elasticsearch.adminClient$,
        dataClient$: setupDeps.core.elasticsearch.dataClient$,
        createClient: setupDeps.core.elasticsearch.createClient,
      },
      http: {
        createCookieSessionStorageFactory: setupDeps.core.http.createCookieSessionStorageFactory,
        registerRouteHandlerContext: setupDeps.core.http.registerRouteHandlerContext.bind(
          null,
          this.legacyId
        ),
        createRouter: () => setupDeps.core.http.createRouter('', this.legacyId),
        registerOnPreAuth: setupDeps.core.http.registerOnPreAuth,
        registerAuth: setupDeps.core.http.registerAuth,
        registerOnPostAuth: setupDeps.core.http.registerOnPostAuth,
        registerOnPreResponse: setupDeps.core.http.registerOnPreResponse,
        basePath: setupDeps.core.http.basePath,
        isTlsEnabled: setupDeps.core.http.isTlsEnabled,
      },
      savedObjects: {
        setClientFactory: setupDeps.core.savedObjects.setClientFactory,
        addClientWrapper: setupDeps.core.savedObjects.addClientWrapper,
        createInternalRepository: setupDeps.core.savedObjects.createInternalRepository,
        createScopedRepository: setupDeps.core.savedObjects.createScopedRepository,
      },
      uiSettings: {
        register: setupDeps.core.uiSettings.register,
      },
    };
    const coreStart: CoreStart = {
      capabilities: startDeps.core.capabilities,
      savedObjects: { getScopedClient: startDeps.core.savedObjects.getScopedClient },
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const KbnServer = require('../../../legacy/server/kbn_server');
    const kbnServer: LegacyKbnServer = new KbnServer(
      settings,
      config,
      {
        env: {
          mode: this.coreContext.env.mode,
          packageInfo: this.coreContext.env.packageInfo,
        },
        setupDeps: {
          core: coreSetup,
          plugins: setupDeps.plugins,
        },
        startDeps: {
          core: coreStart,
          plugins: startDeps.plugins,
        },
        __internals: {
          hapiServer: setupDeps.core.http.server,
          kibanaMigrator: startDeps.core.savedObjects.migrator,
          uiPlugins: setupDeps.core.plugins.uiPlugins,
          elasticsearch: setupDeps.core.elasticsearch,
          uiSettings: setupDeps.core.uiSettings,
          savedObjectsClientProvider: startDeps.core.savedObjects.clientProvider,
        },
        logger: this.coreContext.logger,
      },
      legacyPlugins
    );

    // The kbnWorkerType check is necessary to prevent the repl
    // from being started multiple times in different processes.
    // We only want one REPL.
    if (this.coreContext.env.cliArgs.repl && process.env.kbnWorkerType === 'server') {
      require('../../../cli/repl').startRepl(kbnServer);
    }

    const httpConfig = await this.httpConfig$.pipe(first()).toPromise();

    if (httpConfig.autoListen) {
      try {
        await kbnServer.listen();
      } catch (err) {
        await kbnServer.close();
        throw err;
      }
    } else {
      await kbnServer.ready();
    }

    return kbnServer;
  }
}
