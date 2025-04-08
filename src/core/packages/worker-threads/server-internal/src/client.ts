/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core-http-server';
import type {
  RouteWorker,
  WorkerParams,
  WorkerThreadsRequestClient,
} from '@kbn/core-worker-threads-server/src/types';
import Piscina from 'piscina';
import { fromEvent, merge, of } from 'rxjs';
import { isPromise } from 'util/types';

import { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import { Logger } from '@kbn/logging';
import { MessageChannel } from 'worker_threads';
import { createMainThreadRequestContext } from './create_worker_threads_request_context';
import { createSavedObjectsRpcServer } from './rpc/saved_objects/server';
import { InternalRouteWorkerParams } from './types';

export interface InternalWorkerThreadsClientConfig {
  request: KibanaRequest;
  elasticsearch: InternalElasticsearchServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  pool?: Piscina;
  logger: Logger;
}

export class InternalWorkerThreadsClient implements WorkerThreadsRequestClient {
  private readonly abortController: AbortController;

  constructor(private readonly config: InternalWorkerThreadsClientConfig) {
    this.abortController = new AbortController();
  }

  async run<TInput extends WorkerParams, TOutput extends WorkerParams>(
    filenameOrImport: string | Promise<RouteWorker<TInput, TOutput>>,
    { input, signal }: { input: TInput; signal?: AbortSignal }
  ) {
    const { request, pool, elasticsearch, logger, savedObjects, uiSettings } = this.config;
    const controller = new AbortController();

    merge(request.events.aborted$, signal ? fromEvent(signal, 'abort') : of()).subscribe({
      next: () => {
        controller.abort();
      },
    });

    const runLocally = !pool || isPromise(filenameOrImport);

    if (runLocally) {
      const worker = await (typeof filenameOrImport === 'string'
        ? import(filenameOrImport)
        : filenameOrImport);
      return worker.run({
        input,
        signal,
        core: createMainThreadRequestContext({
          request,
          elasticsearchStart$: of(elasticsearch),
          savedObjectsStart$: of(savedObjects),
          uiSettingsStart$: of(uiSettings),
        }),
        logger,
        request,
      });
    }

    const soChannel = new MessageChannel();

    const soClient = await savedObjects.getScopedClient(request);

    const savedObjectsServer = createSavedObjectsRpcServer(soClient)(soChannel.port1);

    return pool
      .run(
        {
          filename: filenameOrImport,
          input,
          request: {
            headers: request.headers,
            path: request.url.pathname,
          },
          rpc: {
            savedObjects: {
              namespace: await soClient.getCurrentNamespace(),
              port: soChannel.port2,
            },
          },
        } satisfies Omit<InternalRouteWorkerParams, 'signal'>,
        {
          signal: controller.signal,
          transferList: [soChannel.port2],
        }
      )
      .finally(() => {
        savedObjectsServer.destroy();
      });
  }
  async destroy() {
    this.abortController.abort();
  }
}
