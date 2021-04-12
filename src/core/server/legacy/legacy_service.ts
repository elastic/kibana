/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { Server } from '@hapi/hapi';
import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  reconfigureLogging,
  setupLogging,
  setupLoggingRotate,
  LegacyLoggingConfig,
} from '@kbn/legacy-logging';

import { CoreContext } from '../core_context';
import { config as loggingConfig } from '../logging';
import { opsConfig, OpsConfigType } from '../metrics';
import { Logger } from '../logging';
import { InternalHttpServiceSetup } from '../http';

export interface LegacyServiceSetupDeps {
  http: InternalHttpServiceSetup;
}

/** @internal */
export type ILegacyService = PublicMethodsOf<LegacyService>;

/** @internal */
export class LegacyService {
  private readonly log: Logger;
  private readonly opsConfig$: Observable<OpsConfigType>;
  private readonly legacyLoggingConfig$: Observable<LegacyLoggingConfig>;
  private configSubscription?: Subscription;

  constructor(coreContext: CoreContext) {
    const { logger, configService } = coreContext;

    this.log = logger.get('legacy-service');
    this.legacyLoggingConfig$ = configService.atPath<LegacyLoggingConfig>(loggingConfig.path);
    this.opsConfig$ = configService.atPath<OpsConfigType>(opsConfig.path);
  }

  public async setup(setupDeps: LegacyServiceSetupDeps) {
    this.log.debug('setting up legacy service');
    await this.setupLegacyLogging(setupDeps.http.server);
  }

  private async setupLegacyLogging(server: Server) {
    const legacyLoggingConfig = await this.legacyLoggingConfig$.pipe(first()).toPromise();
    const currentOpsConfig = await this.opsConfig$.pipe(first()).toPromise();

    await setupLogging(server, legacyLoggingConfig, currentOpsConfig.interval.asMilliseconds());
    await setupLoggingRotate(server, legacyLoggingConfig);

    this.configSubscription = combineLatest([this.legacyLoggingConfig$, this.opsConfig$]).subscribe(
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
}
