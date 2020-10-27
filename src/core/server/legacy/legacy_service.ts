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
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PathConfigType } from '@kbn/utils';

// @ts-expect-error legacy config class
import { Config as LegacyConfigClass } from '../../../legacy/server/config';
import { CoreService } from '../../types';
import { Config } from '../config';
import { CoreContext } from '../core_context';
import { CspConfigType, config as cspConfig } from '../csp';
import { DevConfig, DevConfigType, config as devConfig } from '../dev';
import { BasePathProxyServer, HttpConfig, HttpConfigType, config as httpConfig } from '../http';
import { Logger } from '../logging';
import { LegacyServiceSetupDeps, LegacyServiceStartDeps, LegacyConfig, LegacyVars } from './types';
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
export type ILegacyService = PublicMethodsOf<LegacyService>;

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
  private update$?: ConnectableObservable<[Config, PathConfigType]>;
  private legacyRawConfig?: LegacyConfig;
  private settings?: LegacyVars;

  constructor(private readonly coreContext: CoreContext) {
    const { logger, configService } = coreContext;

    this.log = logger.get('legacy-service');
    this.devConfig$ = configService
      .atPath<DevConfigType>(devConfig.path)
      .pipe(map((rawConfig) => new DevConfig(rawConfig)));
    this.httpConfig$ = combineLatest(
      configService.atPath<HttpConfigType>(httpConfig.path),
      configService.atPath<CspConfigType>(cspConfig.path)
    ).pipe(map(([http, csp]) => new HttpConfig(http, csp)));
  }

  public async setupLegacyConfig() {
    this.update$ = combineLatest([
      this.coreContext.configService.getConfig$(),
      this.coreContext.configService.atPath<PathConfigType>('path'),
    ]).pipe(
      tap(([config, pathConfig]) => {
        if (this.kbnServer !== undefined) {
          this.kbnServer.applyLoggingConfiguration(getLegacyRawConfig(config, pathConfig));
        }
      }),
      tap({ error: (err) => this.log.error(err) }),
      publishReplay(1)
    ) as ConnectableObservable<[Config, PathConfigType]>;

    this.configSubscription = this.update$.connect();

    this.settings = await this.update$
      .pipe(
        first(),
        map(([config, pathConfig]) => getLegacyRawConfig(config, pathConfig))
      )
      .toPromise();

    this.legacyRawConfig = LegacyConfigClass.withDefaultSchema(this.settings);

    return {
      settings: this.settings,
      legacyConfig: this.legacyRawConfig!,
    };
  }

  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.log.debug('setting up legacy service');

    if (!this.legacyRawConfig) {
      throw new Error(
        'Legacy config not initialized yet. Ensure LegacyService.setupLegacyConfig() is called before LegacyService.setup()'
      );
    }

    // propagate the instance uuid to the legacy config, as it was the legacy way to access it.
    this.legacyRawConfig!.set('server.uuid', setupDeps.core.environment.instanceUuid);

    this.setupDeps = setupDeps;
  }

  public async start(startDeps: LegacyServiceStartDeps) {
    const { setupDeps } = this;

    if (!setupDeps || !this.legacyRawConfig) {
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
        startDeps
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
    const { ClusterManager } = require('./cluster_manager');
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
    startDeps: LegacyServiceStartDeps
  ) {
    const coreStart: CoreStart = {
      capabilities: startDeps.core.capabilities,
      elasticsearch: startDeps.core.elasticsearch,
      http: {
        auth: startDeps.core.http.auth,
        basePath: startDeps.core.http.basePath,
        getServerInfo: startDeps.core.http.getServerInfo,
      },
      savedObjects: {
        getScopedClient: startDeps.core.savedObjects.getScopedClient,
        createScopedRepository: startDeps.core.savedObjects.createScopedRepository,
        createInternalRepository: startDeps.core.savedObjects.createInternalRepository,
        createSerializer: startDeps.core.savedObjects.createSerializer,
        getTypeRegistry: startDeps.core.savedObjects.getTypeRegistry,
      },
      metrics: {
        collectionInterval: startDeps.core.metrics.collectionInterval,
        getOpsMetrics$: startDeps.core.metrics.getOpsMetrics$,
      },
      uiSettings: { asScopedToClient: startDeps.core.uiSettings.asScopedToClient },
      coreUsageData: {
        getCoreUsageData: () => {
          throw new Error('core.start.coreUsageData.getCoreUsageData is unsupported in legacy');
        },
      },
    };

    const router = setupDeps.core.http.createRouter('', this.legacyId);
    const coreSetup: CoreSetup = {
      capabilities: setupDeps.core.capabilities,
      context: setupDeps.core.context,
      elasticsearch: {
        legacy: setupDeps.core.elasticsearch.legacy,
      },
      http: {
        createCookieSessionStorageFactory: setupDeps.core.http.createCookieSessionStorageFactory,
        registerRouteHandlerContext: setupDeps.core.http.registerRouteHandlerContext.bind(
          null,
          this.legacyId
        ),
        createRouter: () => router,
        resources: setupDeps.core.httpResources.createRegistrar(router),
        registerOnPreRouting: setupDeps.core.http.registerOnPreRouting,
        registerOnPreAuth: setupDeps.core.http.registerOnPreAuth,
        registerAuth: setupDeps.core.http.registerAuth,
        registerOnPostAuth: setupDeps.core.http.registerOnPostAuth,
        registerOnPreResponse: setupDeps.core.http.registerOnPreResponse,
        basePath: setupDeps.core.http.basePath,
        auth: {
          get: setupDeps.core.http.auth.get,
          isAuthenticated: setupDeps.core.http.auth.isAuthenticated,
        },
        csp: setupDeps.core.http.csp,
        getServerInfo: setupDeps.core.http.getServerInfo,
      },
      i18n: setupDeps.core.i18n,
      logging: {
        configure: (config$) => setupDeps.core.logging.configure([], config$),
      },
      metrics: {
        collectionInterval: setupDeps.core.metrics.collectionInterval,
        getOpsMetrics$: setupDeps.core.metrics.getOpsMetrics$,
      },
      savedObjects: {
        setClientFactoryProvider: setupDeps.core.savedObjects.setClientFactoryProvider,
        addClientWrapper: setupDeps.core.savedObjects.addClientWrapper,
        registerType: setupDeps.core.savedObjects.registerType,
        getImportExportObjectLimit: setupDeps.core.savedObjects.getImportExportObjectLimit,
      },
      status: {
        isStatusPageAnonymous: setupDeps.core.status.isStatusPageAnonymous,
        core$: setupDeps.core.status.core$,
        overall$: setupDeps.core.status.overall$,
        set: () => {
          throw new Error(`core.status.set is unsupported in legacy`);
        },
        // @ts-expect-error
        get dependencies$() {
          throw new Error(`core.status.dependencies$ is unsupported in legacy`);
        },
        // @ts-expect-error
        get derivedStatus$() {
          throw new Error(`core.status.derivedStatus$ is unsupported in legacy`);
        },
      },
      uiSettings: {
        register: setupDeps.core.uiSettings.register,
      },
      getStartServices: () => Promise.resolve([coreStart, startDeps.plugins, {}]),
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const KbnServer = require('../../../legacy/server/kbn_server');
    const kbnServer: LegacyKbnServer = new KbnServer(settings, config, {
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
        uiPlugins: setupDeps.uiPlugins,
        rendering: setupDeps.core.rendering,
      },
      logger: this.coreContext.logger,
    });

    // The kbnWorkerType check is necessary to prevent the repl
    // from being started multiple times in different processes.
    // We only want one REPL.
    if (this.coreContext.env.cliArgs.repl && process.env.kbnWorkerType === 'server') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./cli').startRepl(kbnServer);
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
