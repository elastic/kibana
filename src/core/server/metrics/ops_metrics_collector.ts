/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server as HapiServer } from '@hapi/hapi';
import {
  ProcessMetricsCollector,
  OsMetricsCollector,
  OpsMetricsCollectorOptions,
  ServerMetricsCollector,
  MetricsCollector,
} from './collectors';
import { OpsMetrics } from './types';

export class OpsMetricsCollector implements MetricsCollector<OpsMetrics> {
  private readonly processCollector: ProcessMetricsCollector;
  private readonly osCollector: OsMetricsCollector;
  private readonly serverCollector: ServerMetricsCollector;

  constructor(server: HapiServer, opsOptions: OpsMetricsCollectorOptions) {
    this.processCollector = new ProcessMetricsCollector();
    this.osCollector = new OsMetricsCollector(opsOptions);
    this.serverCollector = new ServerMetricsCollector(server);
  }

  public async collect(): Promise<OpsMetrics> {
    const [processes, os, server] = await Promise.all([
      this.processCollector.collect(),
      this.osCollector.collect(),
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
      ...server,
    };
  }

  public reset() {
    this.processCollector.reset();
    this.osCollector.reset();
    this.serverCollector.reset();
  }
}
