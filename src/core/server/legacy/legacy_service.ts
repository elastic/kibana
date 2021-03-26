/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, ConnectableObservable, EMPTY, Observable, Subscription } from 'rxjs';
import { first, map, publishReplay, tap } from 'rxjs/operators';
import { Server } from '@hapi/hapi';
import {
  reconfigureLogging,
  setupLogging,
  setupLoggingRotate,
  LegacyLoggingConfig,
} from '@kbn/legacy-logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PathConfigType } from '@kbn/utils';

import { CoreService } from '../../types';
import { Config } from '../config';
import { CoreContext } from '../core_context';
import { CspConfigType, config as cspConfig } from '../csp';
import { DevConfig, DevConfigType, config as devConfig } from '../dev';
import { config as loggingConfig } from '../logging';
import { opsConfig, OpsConfigType } from '../metrics';
import { BasePathProxyServer, HttpConfig, HttpConfigType, config as httpConfig } from '../http';
import { Logger } from '../logging';
import { LegacyServiceSetupDeps, LegacyConfig, LegacyVars } from './types';
import { ExternalUrlConfigType, config as externalUrlConfig } from '../external_url';

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
  private readonly opsConfig$: Observable<OpsConfigType>;
  private readonly legacyLoggingConfig$: Observable<LegacyLoggingConfig>;
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
      configService.atPath<CspConfigType>(cspConfig.path),
      configService.atPath<ExternalUrlConfigType>(externalUrlConfig.path)
    ).pipe(map(([http, csp, externalUrl]) => new HttpConfig(http, csp, externalUrl)));

    this.legacyLoggingConfig$ = configService.atPath<LegacyLoggingConfig>(loggingConfig.path);
    this.opsConfig$ = configService.atPath<OpsConfigType>(opsConfig.path);
  }

  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.log.debug('setting up legacy service');

    this.update$ = combineLatest([
      this.coreContext.configService.getConfig$(),
      this.coreContext.configService.atPath<PathConfigType>('path'),
    ]).pipe(
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

    // this.legacyRawConfig = LegacyConfigClass.withDefaultSchema(this.settings);
    // propagate the instance uuid to the legacy config, as it was the legacy way to access it.
    // this.legacyRawConfig!.set('server.uuid', setupDeps.core.environment.instanceUuid);

    this.setupDeps = setupDeps;
    await this.setupLegacyLogging(setupDeps.core.http.server);
  }

  public async start() {
    const { setupDeps } = this;

    if (!setupDeps || !this.legacyRawConfig) {
      throw new Error('Legacy service is not setup yet.');
    }

    this.log.debug('starting legacy service');

    // Receive initial config and create kbnServer/ClusterManager.
    if (this.coreContext.env.isDevCliParent) {
      // await this.setupCliDevMode(this.legacyRawConfig!);
    }
  }

  private async setupLegacyLogging(server: Server) {
    const legacyLoggingConfig = await this.legacyLoggingConfig$.pipe(first()).toPromise();
    const currentOpsConfig = await this.opsConfig$.pipe(first()).toPromise();

    await setupLogging(server, legacyLoggingConfig, currentOpsConfig.interval.asMilliseconds());
    await setupLoggingRotate(server, legacyLoggingConfig);

    combineLatest([this.legacyLoggingConfig$, this.opsConfig$]).subscribe(
      ([newLoggingConfig, newOpsConfig]) => {
        reconfigureLogging(server, newLoggingConfig, newOpsConfig.interval.asMilliseconds());
      }
    );
  }

  public async stop() {
    this.log.debug('stopping legacy service');

    if (this.configSubscription !== undefined) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }
  }

  private async setupCliDevMode(config: LegacyConfig) {
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
    const { CliDevMode } = require('./cli_dev_mode');
    CliDevMode.fromCoreServices(
      this.coreContext.env.cliArgs,
      config,
      await basePathProxy$.toPromise()
    );
  }
}
