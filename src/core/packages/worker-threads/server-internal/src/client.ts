/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core-http-server';
import Piscina from 'piscina';
import { fromEvent, merge, of } from 'rxjs';
import {
  RouteWorker,
  WorkerParams,
  WorkerThreadsRequestClient,
} from '@kbn/core-worker-threads-server/src/types';
import { isPromise } from 'util/types';

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import { Logger } from '@kbn/logging';
import { MessageChannel } from 'worker_threads';
import { InternalRouteWorkerParams } from './types';

export interface InternalWorkerThreadsClientConfig {
  elasticsearch: InternalElasticsearchServiceStart;
  request: KibanaRequest;
  pool: Piscina;
  logger: Logger;
  messageChannel: MessageChannel;
}

export class InternalWorkerThreadsClient implements WorkerThreadsRequestClient {
  private readonly abortController: AbortController;

  private client?: IScopedClusterClient;

  constructor(private readonly config: InternalWorkerThreadsClientConfig) {
    this.abortController = new AbortController();
  }

  async run<TInput extends WorkerParams, TOutput extends WorkerParams>(
    filenameOrImport: string | Promise<RouteWorker<TInput, TOutput>>,
    { input, signal }: { input: TInput; signal?: AbortSignal }
  ) {
    const { request, pool, messageChannel } = this.config;
    const controller = new AbortController();

    merge(request.events.aborted$, signal ? fromEvent(signal, 'abort') : of()).subscribe({
      next: () => {
        controller.abort();
      },
    });

    if (isPromise(filenameOrImport)) {
      if (!this.client) {
        this.client = this.config.elasticsearch.client.asScoped(request);
      }
      const worker = await filenameOrImport;
      return worker.run({
        input,
        signal,
        core: {
          elasticsearch: {
            client: this.client,
          },
        },
        logger: this.config.logger,
        port: messageChannel.port1,
      });
    }

    return pool.run(
      {
        filename: filenameOrImport,
        input,
        request: {
          headers: request.headers,
          path: request.url.pathname,
        },
        port: messageChannel.port1,
      } satisfies Omit<InternalRouteWorkerParams, 'signal'>,
      {
        signal: controller.signal,
        transferList: [messageChannel.port1],
      }
    );
  }
  async destroy() {
    this.abortController.abort();
  }
}
