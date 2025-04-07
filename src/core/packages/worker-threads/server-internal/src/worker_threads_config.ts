/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const workerThreadsSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  minWorkers: schema.number({ min: 1, max: 4, defaultValue: 4 }),
  maxWorkers: schema.number({ min: 1, max: 10, defaultValue: 8 }),
  idleTimeout: schema.number({ min: 0, defaultValue: 2000 }),
});

export type WorkerThreadsConfigType = TypeOf<typeof workerThreadsSchema>;

export const workerThreadsConfig: ServiceConfigDescriptor<WorkerThreadsConfigType> = {
  path: 'workerThreads',
  schema: workerThreadsSchema,
};

export class WorkerThreadsConfig {
  public enabled: boolean;
  public minWorkers: number;
  public maxWorkers: number;
  public idleTimeout: number;

  constructor(rawConfig: WorkerThreadsConfigType) {
    this.enabled = rawConfig.enabled;
    this.minWorkers = rawConfig.minWorkers;
    this.maxWorkers = rawConfig.maxWorkers;
    this.idleTimeout = rawConfig.idleTimeout;
  }
}
