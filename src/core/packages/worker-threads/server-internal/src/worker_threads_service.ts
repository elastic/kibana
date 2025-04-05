/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import {
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server-internal';
import { KibanaRequest } from '@kbn/core-http-server';
import { WorkerThreadsRequestClient } from '@kbn/core-worker-threads-server/src/types';
import { LogRecord, Logger } from '@kbn/logging';
import Path from 'path';
import Piscina from 'piscina';
import { Observable, Subject } from 'rxjs';
import { MessageChannel } from 'worker_threads';
import { unsafeConsole } from '@kbn/security-hardening';
import { InternalWorkerThreadsClient } from './client';
import { InternalRouteWorkerData } from './types';
import { serialize } from './utils';

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InternalWorkerThreadsServiceSetup {}

/**
 * @internal
 */
export interface InternalWorkerThreadsServiceStart {
  getClientWithRequest: (request: KibanaRequest) => WorkerThreadsRequestClient;
}

interface SetupDeps {
  elasticsearch: InternalElasticsearchServiceSetup;
}

interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
}

/** @internal */
export class WorkerThreadsService
  implements CoreService<InternalWorkerThreadsServiceSetup, InternalWorkerThreadsServiceStart>
{
  private routeWorkerPool?: Piscina;
  private log: Logger;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('worker-threads-service');
  }

  public setup({}: SetupDeps): InternalWorkerThreadsServiceSetup {
    return {};
  }

  public async start({ elasticsearch }: StartDeps): Promise<InternalWorkerThreadsServiceStart> {
    const services = await serialize({
      ConfigService: this.coreContext.configService,
      Env: this.coreContext.env,
    });

    const routeWorkerPool = (this.routeWorkerPool = new Piscina({
      filename: Path.join(__dirname, './route_worker_entry.js'),
      workerData: {
        services,
      } satisfies InternalRouteWorkerData,
    })).on('error', (err) => {
      this.log.error(err);
    });

    return {
      getClientWithRequest: (request: KibanaRequest) => {
        const messageChannel = new MessageChannel();

        messageChannel.port2.unref();

        messageChannel.port2.on('message', (msg) => {
          // eslint-disable-next-line @kbn/eslint/no_unsafe_console
          unsafeConsole.log(msg);
        });

        return new InternalWorkerThreadsClient({
          request,
          pool: routeWorkerPool,
          elasticsearch,
          logger: this.log,
          messageChannel,
        });
      },
    };
  }

  public async stop(): Promise<void> {
    return await this.routeWorkerPool?.destroy();
  }
}
