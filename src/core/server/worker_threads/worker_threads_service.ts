/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreService } from 'src/core/types';
import path from 'path';
import Piscina from 'piscina';
import { InternalElasticsearchServiceSetup } from '../elasticsearch';

export interface SetupDeps {
  elasticsearch: InternalElasticsearchServiceSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkerThreadsServiceSetup {}

export interface RunOptions<T> {
  name: string;
  args: T;
  abortSignal?: AbortSignal;
}

export interface WorkerThreadsServiceStart {
  run: <T = unknown, U = unknown>({ name, args, abortSignal }: RunOptions<T>) => Promise<U>;
}

export class WorkerThreadsService
  implements CoreService<WorkerThreadsServiceSetup, WorkerThreadsServiceStart>
{
  private piscina?: Piscina;

  public async setup({ elasticsearch }: SetupDeps) {
    this.piscina = new Piscina({
      filename: path.resolve(__dirname, 'worker.js'),
      workerData: elasticsearch.getCreateClusterClientParams('worker_thtread'),
    });
    return {};
  }
  public async start() {
    return {
      run: async <T, U>({ name, args, abortSignal }: RunOptions<T>) =>
        this.piscina!.run(args, { name, signal: abortSignal }) as Promise<U>,
    };
  }
  public stop() {
    // abort all workers
  }
}
