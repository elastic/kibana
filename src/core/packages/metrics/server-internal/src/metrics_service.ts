/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, map, ReplaySubject, zip } from 'rxjs';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type {
  EluMetrics,
  OpsMetrics,
  MetricsServiceSetup,
  MetricsServiceStart,
} from '@kbn/core-metrics-server';
import apm from 'elastic-apm-node';
import { metrics, ValueType } from '@opentelemetry/api';
import { OpsMetricsCollector } from './ops_metrics_collector';
import { OPS_CONFIG_PATH, type OpsConfigType } from './ops_config';
import { getEcsOpsMetricsLog } from './logging';
import { registerEluHistoryRoute } from './routes/elu_history';
import { createExponentialMovingAverage } from './exponential_moving_average';

/**
 * The period of time for the average ELU calculation.
 * @public
 */
export enum EluTerm {
  Short = 15000,
  Medium = 30000,
  Long = 60000,
}

export interface MetricsServiceSetupDeps {
  http: InternalHttpServiceSetup;
  elasticsearchService: InternalElasticsearchServiceSetup;
}

/** @internal */
export type InternalMetricsServiceSetup = MetricsServiceSetup;

/** @internal */
export type InternalMetricsServiceStart = MetricsServiceStart;

/** @internal */
export class MetricsService
  implements CoreService<InternalMetricsServiceSetup, InternalMetricsServiceStart>
{
  private readonly logger: Logger;
  private readonly opsMetricsLogger: Logger;
  private metricsCollector?: OpsMetricsCollector;
  private collectInterval?: NodeJS.Timeout;
  private metrics$ = new ReplaySubject<OpsMetrics>(1);
  private elu$ = new BehaviorSubject<EluMetrics>({
    long: 0,
    medium: 0,
    short: 0,
  });
  private timeWeightedElu$ = new BehaviorSubject<EluMetrics>({
    long: 0,
    medium: 0,
    short: 0,
  });
  private service?: InternalMetricsServiceSetup;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('metrics');
    this.opsMetricsLogger = coreContext.logger.get('metrics', 'ops');
  }

  public async setup({
    http,
    elasticsearchService,
  }: MetricsServiceSetupDeps): Promise<InternalMetricsServiceSetup> {
    const config = await firstValueFrom(
      this.coreContext.configService.atPath<OpsConfigType>(OPS_CONFIG_PATH)
    );
    const collectionInterval = config.interval.asMilliseconds();

    this.metricsCollector = new OpsMetricsCollector(
      http.server,
      elasticsearchService.agentStatsProvider,
      {
        logger: this.logger,
        ...config.cGroupOverrides,
      }
    );

    this.metricsCollector.registerMetrics();

    await this.refreshMetrics();

    this.collectInterval = setInterval(() => {
      this.refreshMetrics();
    }, collectionInterval);

    const rawElu$ = this.metrics$.pipe(
      map((opsMetrics) => opsMetrics.process.event_loop_utilization.utilization)
    );

    const eluMetrics$ = (algorithm: 'ema' | 'time-weighted-ema') =>
      rawElu$.pipe((elu$) =>
        zip(
          elu$.pipe(createExponentialMovingAverage(algorithm, EluTerm.Short, collectionInterval)),
          elu$.pipe(createExponentialMovingAverage(algorithm, EluTerm.Medium, collectionInterval)),
          elu$.pipe(createExponentialMovingAverage(algorithm, EluTerm.Long, collectionInterval))
        ).pipe(map(([short, medium, long]) => ({ short, medium, long })))
      );

    eluMetrics$('ema').subscribe(this.elu$);
    eluMetrics$('time-weighted-ema').subscribe(this.timeWeightedElu$);
    this.registerEluHistoryMetrics();
    registerEluHistoryRoute(http.createRouter(''), () => ({
      history: this.elu$.value,
      historyTimeWeighted: this.timeWeightedElu$.value,
    }));

    this.service = {
      collectionInterval,
      getOpsMetrics$: () => this.metrics$,
      getEluMetrics$: () => this.elu$,
      getTimeWeightedEluMetrics$: () => this.timeWeightedElu$,
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
    const opsMetrics = await this.metricsCollector!.collect();
    if (this.opsMetricsLogger.isLevelEnabled('debug')) {
      const { message, meta } = getEcsOpsMetricsLog(opsMetrics);
      this.opsMetricsLogger.debug(message!, meta);
    }
    this.metricsCollector!.reset();
    this.metrics$.next(opsMetrics);
  }

  public async stop() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
    }
    this.metrics$.complete();
  }

  private registerEluHistoryMetrics() {
    // Report the same metrics to APM
    apm.registerMetric('elu.history.short', () => this.elu$.value.short);
    apm.registerMetric('elu.history.medium', () => this.elu$.value.medium);
    apm.registerMetric('elu.history.long', () => this.elu$.value.long);
    apm.registerMetric('elu.history.time_weighted.short', () => this.timeWeightedElu$.value.short);
    apm.registerMetric('elu.history.time_weighted.medium', () => this.timeWeightedElu$.value.medium);
    apm.registerMetric('elu.history.time_weighted.long', () => this.timeWeightedElu$.value.long);

    // Report the same metrics to OpenTelemetry
    const meter = metrics.getMeter('kibana.process');
    meter
      // Not calling it 'nodejs.eventloop.utilization.history' to avoid potential issues with the existing metric `nodejs.eventloop.utilization`.
      .createObservableGauge('nodejs.eventloop.history.utilization', {
        description:
          'The event loop utilization averaged over a set of sample buckets: short (3 samples), medium (6), long (12). Use `nodejs.eventloop.history.window` to select the correct window.',
        unit: '1',
        valueType: ValueType.DOUBLE,
      })
      .addCallback((result) => {
        const observe = (values: EluMetrics, smoothing: 'interval' | 'time-weighted') => {
          result.observe(values.short, {
            'nodejs.eventloop.history.window': 'short',
            'nodejs.eventloop.history.smoothing': smoothing,
          });
          result.observe(values.medium, {
            'nodejs.eventloop.history.window': 'medium',
            'nodejs.eventloop.history.smoothing': smoothing,
          });
          result.observe(values.long, {
            'nodejs.eventloop.history.window': 'long',
            'nodejs.eventloop.history.smoothing': smoothing,
          });
        };
        observe(this.elu$.value, 'interval');
        observe(this.timeWeightedElu$.value, 'time-weighted');
      });
  }
}
