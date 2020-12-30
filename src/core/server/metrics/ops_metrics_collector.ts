/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
