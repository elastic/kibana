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
import { Config, ConfigDeprecationProvider } from '../config';
import { CoreContext } from '../core_context';
import { CspConfigType, config as cspConfig } from '../csp';
import { DevConfig, DevConfigType, config as devConfig } from '../dev';
import { BasePathProxyServer, HttpConfig, HttpConfigType, config as httpConfig } from '../http';
import { Logger } from '../logging';
import { PathConfigType } from '../path';
import { findLegacyPluginSpecs } from './plugins';
import { convertLegacyDeprecationProvider } from './config';
import {
  LegacyServiceSetupDeps,
  LegacyServiceStartDeps,
  LegacyPlugins,
  LegacyServiceDiscoverPlugins,
  LegacyConfig,
  LegacyVars,
} from './types';
import { LegacyInternals } from './legacy_internals';
import { CoreSetup, CoreStart } from '..';

interface LegacyKbnServer {
  applyLoggingConfiguration: (settings: Readonly<LegacyVars>) => void;
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
    // We rely heavily in the default value of 'path.data' in the legacy world and,
    // since it has been moved to NP, it won't show up in RawConfig.
    path: pathConfig,
  };
}

/** @internal */
export type ILegacyService = Pick<LegacyService, keyof LegacyService>;

/** @internal */
export class LegacyService implements CoreService {
  /** Symbol to represent the legacy platform as a fake "plugin". Used by the ContextService */
  public readonly legacyId = Symbol();
  private hasDiscovered = false;
  private readonly log: Logger;
  private readonly devConfig$: Observable<DevConfig>;
  private readonly httpConfig$: Observable<HttpConfig>;
  private kbnServer?: LegacyKbnServer;
  private configSubscription?: Subscription;
  private setupDeps?: LegacyServiceSetupDeps;
  private update$?: ConnectableObservable<[Config, PathConfigType]>;
  private legacyRawConfig?: LegacyConfig;
  private legacyPlugins?: LegacyPlugins;
  private settings?: LegacyVars;

  constructor(private readonly coreContext: CoreContext) {
    const { logger, configService, env } = coreContext;

    this.log = logger.get('legacy-service');
    this.devConfig$ = configService
      .atPath<DevConfigType>(devConfig.path)
      .pipe(map(rawConfig => new DevConfig(rawConfig)));
    this.httpConfig$ = combineLatest(
      configService.atPath<HttpConfigType>(httpConfig.path),
      configService.atPath<CspConfigType>(cspConfig.path)
    ).pipe(map(([http, csp]) => new HttpConfig(http, csp, env)));
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
      navLinks,
    } = await findLegacyPluginSpecs(this.settings, this.coreContext.logger);

    this.legacyPlugins = {
      pluginSpecs,
      disabledPluginSpecs,
      uiExports,
      navLinks,
    };

    const deprecationProviders = await pluginSpecs
      .map(spec => spec.getDeprecationsProvider())
      .reduce(async (providers, current) => {
        if (current) {
          return [...(await providers), await convertLegacyDeprecationProvider(current)];
        }
        return providers;
      }, Promise.resolve([] as ConfigDeprecationProvider[]));
    deprecationProviders.forEach(provider =>
      this.coreContext.configService.addDeprecationProvider('', provider)
    );

    this.legacyRawConfig = pluginExtendedConfig;

    // check for unknown uiExport types
    if (uiExports.unknown && uiExports.unknown.length > 0) {
      throw new Error(
        `Unknown uiExport types: ${uiExports.unknown
          .map(({ pluginSpec, type }) => `${type} from ${pluginSpec.getId()}`)
          .join(', ')}`
      );
    }

    this.hasDiscovered = true;

    return {
      pluginSpecs,
      disabledPluginSpecs,
      uiExports,
      navLinks,
      pluginExtendedConfig,
      settings: this.settings,
    };
  }

  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.log.debug('setting up legacy service');

    if (!this.hasDiscovered) {
      throw new Error(
        'Legacy service has not discovered legacy plugins yet. Ensure LegacyService.discoverPlugins() is called before LegacyService.setup()'
      );
    }

    // propagate the instance uuid to the legacy config, as it was the legacy way to access it.
    this.legacyRawConfig!.set('server.uuid', setupDeps.core.uuid.getInstanceUuid());
    this.setupDeps = setupDeps;
  }

  public async start(startDeps: LegacyServiceStartDeps) {
    const { setupDeps } = this;

    if (!setupDeps || !this.hasDiscovered) {
      throw new Error('Legacy service is not setup yet.');
    }

    this.log.debug('starting legacy service');

    // Receive initial config and create kbnServer/ClusterManager.
    if (this.coreContext.env.isDevClusterMaster) {
      await this.createClusterManager(this.legacyRawConfig!);
    } else {
      this.kbnServer = await this.createKbnServer(
        this.settings!,
        this.legacyRawConfig!,
        setupDeps,
        startDeps,
        this.legacyPlugins!
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
      ? combineLatest([this.devConfig$, this.httpConfig$]).pipe(
          first(),
          map(
            ([dev, http]) =>
              new BasePathProxyServer(this.coreContext.logger.get('server'), http, dev)
          )
        )
      : EMPTY;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ClusterManager } = require('../../../cli/cluster/cluster_manager');
    return new ClusterManager(
      this.coreContext.env.cliArgs,
      config,
      await basePathProxy$.toPromise()
    );
  }

  private async createKbnServer(
    settings: LegacyVars,
    config: LegacyConfig,
    setupDeps: LegacyServiceSetupDeps,
    startDeps: LegacyServiceStartDeps,
    legacyPlugins: LegacyPlugins
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
        csp: setupDeps.core.http.csp,
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
      uuid: {
        getInstanceUuid: setupDeps.core.uuid.getInstanceUuid,
      },
    };
    const coreStart: CoreStart = {
      capabilities: startDeps.core.capabilities,
      savedObjects: { getScopedClient: startDeps.core.savedObjects.getScopedClient },
      uiSettings: { asScopedToClient: startDeps.core.uiSettings.asScopedToClient },
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
          rendering: setupDeps.core.rendering,
          uiSettings: setupDeps.core.uiSettings,
          savedObjectsClientProvider: startDeps.core.savedObjects.clientProvider,
          legacy: new LegacyInternals(legacyPlugins, config, setupDeps.core.http.server),
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

    const { autoListen } = await this.httpConfig$.pipe(first()).toPromise();

    if (autoListen) {
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
