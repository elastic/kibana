/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { Esqueue, events as esqueueEvents } from '../lib/esqueue';
import { Job as JobInternal } from '../lib/esqueue/job';
import { Worker as WorkerInternal } from '../lib/esqueue/worker';

export interface Job {
  payload: any;
  options: any;
  cancellationToken: string | null;
}

export interface Worker {
  createJob(payload: any, options: any): Job;
  executeJob(job: Job): void;
  enqueueJob(payload: any, options: any): void;
}

export abstract class AbstractWorker implements Worker {
  // The id of the worker. Also serves as the id of the job this worker consumes.
  protected id = '';

  constructor(protected readonly queue: Esqueue, protected readonly server: Hapi.Server) {}

  // Assemble jobs, for now most of the job object construction should be the same.
  public createJob(payload: any, options: any): Job {
    return {
      payload,
      options,
      cancellationToken: '',
    };
  }

  public async executeJob(job: Job) {
    // This is an abstract class. Do nothing here. You should override this.
    return;
  }

  // Enqueue the job.
  public async enqueueJob(payload: any, options: any) {
    const job: Job = this.createJob(payload, options);
    return new Promise((resolve, reject) => {
      const jobInternal: JobInternal = this.queue.addJob(this.id, job, {});
      jobInternal.on(esqueueEvents.EVENT_JOB_CREATED, (createdJob: JobInternal) => {
        if (createdJob.id === jobInternal.id) {
          resolve(jobInternal);
        }
      });
      jobInternal.on(esqueueEvents.EVENT_JOB_CREATE_ERROR, reject);
    });
  }

  public bind() {
    const workerFn = (payload: any, cancellationToken: string) => {
      const job: Job = {
        ...payload,
        cancellationToken,
      };
      this.executeJob(job);
      return;
    };

    const workerOptions = {
      interval: 3000,
      intervalErrorMultiplier: 1,
    };

    const queueWorker: WorkerInternal = this.queue.registerWorker(this.id, workerFn, workerOptions);

    // TODO(mengwei): will register callbacks from params.
    queueWorker.on(esqueueEvents.EVENT_WORKER_COMPLETE, (res: any) => {
      // log.error(`Woker completed: (${res.job.id})`);
      return;
    });
    queueWorker.on(esqueueEvents.EVENT_WORKER_JOB_EXECUTION_ERROR, (res: any) => {
      // log.error(`Worker error: (${res.job.id}`)
      return;
    });
    queueWorker.on(esqueueEvents.EVENT_WORKER_JOB_TIMEOUT, (res: any) => {
      // log.error(`Job timeout exceeded: (${res.job.id}`)
      return;
    });
  }
}

export * from './cloneWorker';
export * from './deleteWorker';
