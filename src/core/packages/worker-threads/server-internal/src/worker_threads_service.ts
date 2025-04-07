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
import {
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server-internal';
import {
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from '@kbn/core-ui-settings-server-internal';
import { Logger } from '@kbn/logging';
import Path from 'path';
import Piscina from 'piscina';
import { firstValueFrom } from 'rxjs';
import { InternalWorkerThreadsClient } from './client';
import { InternalRouteWorkerData } from './types';
import { serialize } from './utils';
import { WorkerThreadsConfig, WorkerThreadsConfigType } from './worker_threads_config';

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InternalWorkerThreadsServiceSetup {}

/**
 * @internal
 */
export interface InternalWorkerThreadsServiceStart {
  getClientWithRequest: (request: KibanaRequest) => InternalWorkerThreadsClient;
}

interface SetupDeps {
  elasticsearch: InternalElasticsearchServiceSetup;
  uiSettings: InternalUiSettingsServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
}

interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
}

/** @internal */
export class WorkerThreadsService
  implements CoreService<InternalWorkerThreadsServiceSetup, InternalWorkerThreadsServiceStart>
{
  private routeWorkerPool?: Piscina;
  private log: Logger;

  private config?: WorkerThreadsConfig;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('worker-threads-service');
  }

  public async setup({}: SetupDeps): Promise<InternalWorkerThreadsServiceSetup> {
    const config = await firstValueFrom(
      this.coreContext.configService.atPath<WorkerThreadsConfigType>('workerThreads')
    );
    this.config = new WorkerThreadsConfig(config);
    return {};
  }

  public async start({
    elasticsearch,
    savedObjects,
    uiSettings,
  }: StartDeps): Promise<InternalWorkerThreadsServiceStart> {
    const services = await serialize({
      ConfigService: this.coreContext.configService,
      Env: this.coreContext.env,
    });

    const config = this.config!;

    this.log.info(JSON.stringify(config));

    const enabled = config.enabled;

    const routeWorkerPool = enabled
      ? (this.routeWorkerPool = new Piscina({
          filename: Path.join(__dirname, './route_worker_entry.js'),
          workerData: {
            services,
          } satisfies InternalRouteWorkerData,
          minThreads: config.minWorkers,
          maxThreads: config.maxWorkers,
          idleTimeout: config.idleTimeout,
        }))
      : undefined;

    setInterval(() => {
      if (!routeWorkerPool) {
        return;
      }
      const { queueSize, runTime, waitTime, utilization } = routeWorkerPool;
      this.log.info(
        `Worker stats: ${JSON.stringify({ queueSize, runTime, waitTime, utilization })}`
      );
    }, 2500);

    return {
      getClientWithRequest: (request: KibanaRequest) => {
        return new InternalWorkerThreadsClient({
          request,
          elasticsearch,
          savedObjects,
          uiSettings,
          pool: routeWorkerPool,
          logger: this.log,
        });
      },
    };
  }

  public async stop(): Promise<void> {
    return await this.routeWorkerPool?.destroy();
  }
}
