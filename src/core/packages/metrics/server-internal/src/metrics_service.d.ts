/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { MetricsServiceSetup, MetricsServiceStart } from '@kbn/core-metrics-server';
/**
 * The period of time for the average ELU calculation.
 * @public
 */
export declare enum EluTerm {
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
export declare class MetricsService
  implements CoreService<InternalMetricsServiceSetup, InternalMetricsServiceStart>
{
  private readonly coreContext;
  private readonly logger;
  private readonly opsMetricsLogger;
  private metricsCollector?;
  private collectInterval?;
  private metrics$;
  private elu$;
  private service?;
  constructor(coreContext: CoreContext);
  setup({
    http,
    elasticsearchService,
  }: MetricsServiceSetupDeps): Promise<InternalMetricsServiceSetup>;
  start(): Promise<InternalMetricsServiceStart>;
  private refreshMetrics;
  stop(): Promise<void>;
  private registerEluHistoryMetrics;
}
