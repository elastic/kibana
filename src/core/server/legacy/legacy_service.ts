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
import { first, map, mergeMap, publishReplay, tap } from 'rxjs/operators';
import { CoreService } from '../../types';
import { InternalCoreSetup, InternalCoreStart } from '../../server';
import { Config } from '../config';
import { CoreContext } from '../core_context';
import { DevConfig, DevConfigType } from '../dev';
import { BasePathProxyServer, HttpConfig, HttpConfigType } from '../http';
import { Logger } from '../logging';
import { PluginsServiceSetup, PluginsServiceStart } from '../plugins';

interface LegacyKbnServer {
  applyLoggingConfiguration: (settings: Readonly<Record<string, any>>) => void;
  listen: () => Promise<void>;
  ready: () => Promise<void>;
  close: () => Promise<void>;
}

function getLegacyRawConfig(config: Config) {
  const rawConfig = config.toRaw();

  // Elasticsearch config is solely handled by the core and legacy platform
  // shouldn't have direct access to it.
  if (rawConfig.elasticsearch !== undefined) {
    delete rawConfig.elasticsearch;
  }

  return rawConfig;
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
export class LegacyService implements CoreService {
  private readonly log: Logger;
  private readonly devConfig$: Observable<DevConfig>;
  private readonly httpConfig$: Observable<HttpConfig>;
  private kbnServer?: LegacyKbnServer;
  private configSubscription?: Subscription;
  private setupDeps?: LegacyServiceSetupDeps;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('legacy-service');
    this.devConfig$ = coreContext.configService
      .atPath<DevConfigType>('dev')
      .pipe(map(rawConfig => new DevConfig(rawConfig)));
    this.httpConfig$ = coreContext.configService
      .atPath<HttpConfigType>('server')
      .pipe(map(rawConfig => new HttpConfig(rawConfig, coreContext.env)));
  }
  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.setupDeps = setupDeps;
  }
  public async start(startDeps: LegacyServiceStartDeps) {
    const { setupDeps } = this;
    if (!setupDeps) {
      throw new Error('Legacy service is not setup yet.');
    }
    this.log.debug('starting legacy service');

    const update$ = this.coreContext.configService.getConfig$().pipe(
      tap(config => {
        if (this.kbnServer !== undefined) {
          this.kbnServer.applyLoggingConfiguration(config.toRaw());
        }
      }),
      tap({ error: err => this.log.error(err) }),
      publishReplay(1)
    ) as ConnectableObservable<Config>;

    this.configSubscription = update$.connect();

    // Receive initial config and create kbnServer/ClusterManager.
    this.kbnServer = await update$
      .pipe(
        first(),
        mergeMap(async config => {
          if (this.coreContext.env.isDevClusterMaster) {
            await this.createClusterManager(config);
            return;
          }
          return await this.createKbnServer(config, setupDeps, startDeps);
        })
      )
      .toPromise();
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

  private async createClusterManager(config: Config) {
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
      getLegacyRawConfig(config),
      await basePathProxy$.toPromise()
    );
  }

  private async createKbnServer(
    config: Config,
    setupDeps: LegacyServiceSetupDeps,
    startDeps: LegacyServiceStartDeps
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const KbnServer = require('../../../legacy/server/kbn_server');
    const kbnServer: LegacyKbnServer = new KbnServer(getLegacyRawConfig(config), {
      handledConfigPaths: await this.coreContext.configService.getUsedPaths(),
      setupDeps,
      startDeps,
      logger: this.coreContext.logger,
    });

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
