/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ElasticsearchRequestHandlerContext } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';

type Primitive = string | number | boolean | null | undefined;

export interface WorkerThreadsClient {
  run<TInput extends WorkerParams, TOutput extends WorkerParams>(
    filename: string | Promise<Worker<TInput, TOutput>>,
    { input, signal }: { input: TInput; signal: AbortSignal }
  ): Promise<WorkerParams>;
}

export interface Worker<
  TInput extends WorkerParams = WorkerParams,
  TOutput extends WorkerParams = WorkerParams,
  TContext extends Record<string, any> = {}
> {
  run: (options: { input: TInput; signal?: AbortSignal } & TContext) => Promise<TOutput>;
}

export type RouteWorker<
  TInput extends WorkerParams = WorkerParams,
  TOutput extends WorkerParams = WorkerParams
> = Worker<
  TInput,
  TOutput,
  {
    logger: Logger;
    core: {
      elasticsearch: ElasticsearchRequestHandlerContext;
    };
  }
>;

export interface WorkerThreadsRequestClient {
  run<TInput extends WorkerParams, TOutput extends WorkerParams>(
    filenameOrImport: string | Promise<RouteWorker<TInput, TOutput>>,
    {}: { input: TInput; signal?: AbortSignal }
  ): Promise<TOutput>;
}

export interface WorkerParams {
  [x: string]: Primitive | Primitive[] | SharedArrayBuffer;
}
