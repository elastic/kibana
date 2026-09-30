/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'node:worker_threads';
import type { WorkerOptions } from 'node:worker_threads';

/** Internal worker creation contract; consumers own worker termination and lifecycle policy. */
export interface InternalThreadsStart {
  createWorker(filename: string | URL, options?: WorkerOptions): Worker;
}

/** Core's internal worker creation boundary, without pooling or scheduling. */
export class ThreadsService {
  public start(): InternalThreadsStart {
    return {
      createWorker: (filename, options) => new Worker(filename, options),
    };
  }
}
