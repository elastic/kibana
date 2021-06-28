/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { InternalHttpServiceSetup } from '../http';
import { InternalMetricsServiceSetup, InternalMetricsServiceStart, OpsMetrics } from './types';
import { OpsMetricsCollector } from './ops_metrics_collector';
import { opsConfig, OpsConfigType } from './ops_config';
import { getEcsOpsMetricsLog, getEventLoopThresholdLog } from './logging';

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
    const {
      cGroupOverrides,
      interval,
      eventLoopDelayThreshold,
    } = await this.coreContext.configService
      .atPath<OpsConfigType>(opsConfig.path)
      .pipe(first())
      .toPromise();

    const thresholdMs = eventLoopDelayThreshold.asMilliseconds();

    this.metricsCollector = new OpsMetricsCollector(http.server, {
      logger: this.logger,
      ...cGroupOverrides,
    });

    await this.refreshMetrics(thresholdMs);

    this.collectInterval = setInterval(() => {
      this.refreshMetrics(thresholdMs);
    }, interval.asMilliseconds());

    const metricsObservable = this.metrics$.asObservable();

    this.service = {
      collectionInterval: interval.asMilliseconds(),
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

  private async refreshMetrics(thresholdMs: number) {
    const metrics = await this.metricsCollector!.collect();
    const { message, meta } = getEcsOpsMetricsLog(metrics);
    const { message: eventLoopThresholdMessage } = getEventLoopThresholdLog(metrics, thresholdMs);

    this.opsMetricsLogger.debug(message!, meta);
    if (eventLoopThresholdMessage) {
      this.opsMetricsLogger.warn(eventLoopThresholdMessage);
    }
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
