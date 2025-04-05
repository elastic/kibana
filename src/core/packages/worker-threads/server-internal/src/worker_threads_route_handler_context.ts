/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { WorkerThreadsRequestHandlerContext } from '@kbn/core-worker-threads-server/src/request_handler_context';
import { WorkerThreadsRequestClient } from '@kbn/core-worker-threads-server/src/types';
import type { InternalWorkerThreadsServiceStart } from './worker_threads_service';

/**
 * The {@link WorkerThreadsRequestHandlerContext} implementation.
 * @internal
 */
export class CoreWorkerThreadsRouteHandlerContext implements WorkerThreadsRequestHandlerContext {
  #client?: WorkerThreadsRequestClient;

  constructor(
    private readonly workerThreadsStart: InternalWorkerThreadsServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.workerThreadsStart.getClientWithRequest(this.request);
    }
    return this.#client;
  }
}
