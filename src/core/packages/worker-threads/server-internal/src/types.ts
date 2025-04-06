/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FakeRawRequest } from '@kbn/core-http-server';
import { Worker, WorkerParams } from '@kbn/core-worker-threads-server/src/types';

export type TransferableWorkerService = 'ConfigService' | 'Env' | 'Logger';
export type WorkerService = 'ConfigService' | 'Env';

export interface InternalWorkerData {
  services: Record<WorkerService, any>;
}

export type InternalRouteWorkerData = InternalWorkerData;

export interface InternalWorkerParams {
  filename: string;
  input: WorkerParams;
  signal: AbortSignal;
}

export interface InternalRouteWorkerParams extends InternalWorkerParams {
  request: FakeRawRequest;
}

export type InternalRunInWorker<TContext extends Record<string, any> = {}> = (
  filename: string,
  options: { input: WorkerParams; signal: AbortSignal } & TContext
) => Promise<WorkerParams>;

export type InternalRunInRouteWorker = InternalRunInWorker;

export type RunInWorker = <TInput extends WorkerParams, TOutput extends WorkerParams>(
  workerPromise: Promise<Worker<TInput, TOutput>>,
  input: TInput
) => Promise<TOutput>;
