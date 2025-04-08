/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  ElasticsearchRequestHandlerContext,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
import { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';
import { Logger } from '@kbn/logging';
import { Observable } from 'rxjs';

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

export interface BaseWorkerParams {
  logger: Logger;
}

export interface RouteWorkerParams extends BaseWorkerParams {
  core: RouteWorkerCoreRequestContext;
  request: KibanaRequest;
}

export type RouteWorker<
  TInput extends WorkerParams = WorkerParams,
  TOutput extends WorkerParams = WorkerParams
> = Worker<TInput, TOutput, RouteWorkerParams>;

export interface WorkerThreadsRequestClient {
  run<TInput extends WorkerParams, TOutput extends WorkerParams>(
    filename: Promise<RouteWorker<TInput, TOutput>>,
    {}: { input: TInput; signal?: AbortSignal }
  ): Promise<TOutput>;
}

export interface WorkerParams {
  [x: string]: Primitive | Primitive[] | SharedArrayBuffer;
}

export interface RouteWorkerCoreRequestContext {
  elasticsearch: Promise<ElasticsearchRequestHandlerContext>;
  savedObjects: Promise<Pick<SavedObjectsRequestHandlerContext, 'client'>>;
  uiSettings: Promise<Pick<UiSettingsRequestHandlerContext, 'client'>>;
}

export interface WorkerRunContext {
  core: {
    elasticsearch: {
      setup$: Observable<ElasticsearchServiceSetup>;
      start$: Observable<ElasticsearchServiceStart>;
    };
  };
  logger: Logger;
}
