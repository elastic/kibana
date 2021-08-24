/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Server as HapiServer } from '@hapi/hapi';
import type { OpsMetricsCollectorOptions } from './collectors/os';
import { OsMetricsCollector } from './collectors/os';
import { ProcessMetricsCollector } from './collectors/process';
import { ServerMetricsCollector } from './collectors/server';
import type { MetricsCollector } from './collectors/types';
import type { OpsMetrics } from './types';

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
    const [process, os, server] = await Promise.all([
      this.processCollector.collect(),
      this.osCollector.collect(),
      this.serverCollector.collect(),
    ]);
    return {
      collected_at: new Date(),
      process,
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
