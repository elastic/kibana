/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server as HapiServer } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OpsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import type { AgentStatsProvider } from '@kbn/core-elasticsearch-client-server-internal';
export interface OpsMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}
export declare class OpsMetricsCollector implements MetricsCollector<OpsMetrics> {
  private readonly processCollector;
  private readonly osCollector;
  private readonly serverCollector;
  private readonly esClientCollector;
  constructor(
    server: HapiServer,
    agentStatsProvider: AgentStatsProvider,
    opsOptions: OpsMetricsCollectorOptions
  );
  collect(): Promise<OpsMetrics>;
  registerMetrics(): void;
  reset(): void;
}
