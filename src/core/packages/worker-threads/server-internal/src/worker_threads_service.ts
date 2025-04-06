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
import { Logger } from '@kbn/logging';
import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import Piscina from 'piscina';
import { finished } from 'stream/promises';
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
      minThreads: 4,
      idleTimeout: 2000,
    }));

    setTimeout(() => {
      const workers = routeWorkerPool.threads;

      const tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'worker-heap-snapshot'));
      Promise.allSettled(
        workers.map(async (w) => {
          const snapshotStream = await w.getHeapSnapshot();
          const filePath = Path.join(tmpDir, `worker-${w.threadId}-heap.heapsnapshot`);
          const fileStream = Fs.createWriteStream(filePath);

          snapshotStream.pipe(fileStream);

          this.log.info(`Writing heap snapshot for ${w.threadId}`);

          await finished(fileStream);

          this.log.info(`Wrote heap snapshot for ${w.threadId} to ${filePath}`);
        })
      ).then((results) => {});
    }, 5000);
    return {
      getClientWithRequest: (request: KibanaRequest) => {
        return new InternalWorkerThreadsClient({
          request,
          pool: routeWorkerPool,
          elasticsearch,
          logger: this.log,
        });
      },
    };
  }

  public async stop(): Promise<void> {
    return await this.routeWorkerPool?.destroy();
  }
}
