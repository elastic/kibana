/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server as HapiServer } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OpsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import type { AgentStatsProvider } from '@kbn/core-elasticsearch-client-server-internal';
import {
  ProcessMetricsCollector,
  OsMetricsCollector,
  ServerMetricsCollector,
  ElasticsearchClientsMetricsCollector,
} from '@kbn/core-metrics-collectors-server-internal';

export interface OpsMetricsCollectorOptions {
  logger: Logger;
  cpuPath?: string;
  cpuAcctPath?: string;
}

export class OpsMetricsCollector implements MetricsCollector<OpsMetrics> {
  private readonly processCollector: ProcessMetricsCollector;
  private readonly osCollector: OsMetricsCollector;
  private readonly serverCollector: ServerMetricsCollector;
  private readonly esClientCollector: ElasticsearchClientsMetricsCollector;

  constructor(
    server: HapiServer,
    agentStatsProvider: AgentStatsProvider,
    opsOptions: OpsMetricsCollectorOptions
  ) {
    this.processCollector = new ProcessMetricsCollector();
    this.osCollector = new OsMetricsCollector(opsOptions);
    this.serverCollector = new ServerMetricsCollector(server);
    this.esClientCollector = new ElasticsearchClientsMetricsCollector(agentStatsProvider);
  }

  public async collect(): Promise<OpsMetrics> {
    const [processes, os, esClient, server] = await Promise.all([
      this.processCollector.collect(),
      this.osCollector.collect(),
      this.esClientCollector.collect(),
      this.serverCollector.collect(),
    ]);

    return {
      collected_at: new Date(),
      /**
       * Kibana does not yet support multi-process nodes.
       * `processes` is just an Array(1) only returning the current process's data
       *  which is why we can just use processes[0] for `process`
       */
      process: processes[0],
      processes,
      os,
      elasticsearch_client: esClient,
      ...server,
    };
  }

  public reset() {
    this.processCollector.reset();
    this.osCollector.reset();
    this.serverCollector.reset();
  }
}
