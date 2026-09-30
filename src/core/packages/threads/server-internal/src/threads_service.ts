/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ManagedWorkerHandle } from './managed_worker';
import type { ManagedWorker, ManagedWorkerOptions } from './managed_worker';

/** Internal managed worker contract; consumers supply policy rather than handling Node workers. */
export interface InternalThreadsStart {
  createWorker<Message>(options: ManagedWorkerOptions<Message>): ManagedWorker;
}

/** Core's internal worker creation boundary, without pooling or scheduling. */
export class ThreadsService {
  public start(): InternalThreadsStart {
    return {
      createWorker: (options) => new ManagedWorkerHandle(options),
    };
  }
}
