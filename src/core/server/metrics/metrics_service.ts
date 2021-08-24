/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import { ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';
import type { CoreService } from '../../types/core_service';
import type { CoreContext } from '../core_context';
import type { InternalHttpServiceSetup } from '../http/types';
import { getEcsOpsMetricsLog } from './logging/get_ops_metrics_log';
import type { OpsConfigType } from './ops_config';
import { opsConfig } from './ops_config';
import { OpsMetricsCollector } from './ops_metrics_collector';
import type { InternalMetricsServiceSetup, InternalMetricsServiceStart, OpsMetrics } from './types';

interface MetricsServiceSetupDeps {
  http: InternalHttpServiceSetup;
}

/** @internal */
export class MetricsService
  implements CoreService<InternalMetricsServiceSetup, InternalMetricsServiceStart> {
  private readonly logger: Logger;
  private readonly opsMetricsLogger: Logger;
  private metricsCollector?: OpsMetricsCollector;
  private collectInterval?: NodeJS.Timeout;
  private metrics$ = new ReplaySubject<OpsMetrics>(1);
  private service?: InternalMetricsServiceSetup;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('metrics');
    this.opsMetricsLogger = coreContext.logger.get('metrics', 'ops');
  }

  public async setup({ http }: MetricsServiceSetupDeps): Promise<InternalMetricsServiceSetup> {
    const config = await this.coreContext.configService
      .atPath<OpsConfigType>(opsConfig.path)
      .pipe(first())
      .toPromise();

    this.metricsCollector = new OpsMetricsCollector(http.server, {
      logger: this.logger,
      ...config.cGroupOverrides,
    });

    await this.refreshMetrics();

    this.collectInterval = setInterval(() => {
      this.refreshMetrics();
    }, config.interval.asMilliseconds());

    const metricsObservable = this.metrics$.asObservable();

    this.service = {
      collectionInterval: config.interval.asMilliseconds(),
      getOpsMetrics$: () => metricsObservable,
    };

    return this.service;
  }

  public async start(): Promise<InternalMetricsServiceStart> {
    if (!this.service) {
      throw new Error('#setup() needs to be run first');
    }

    return this.service;
  }

  private async refreshMetrics() {
    const metrics = await this.metricsCollector!.collect();
    const { message, meta } = getEcsOpsMetricsLog(metrics);
    this.opsMetricsLogger.debug(message!, meta);
    this.metricsCollector!.reset();
    this.metrics$.next(metrics);
  }

  public async stop() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
    }
    this.metrics$.complete();
  }
}
