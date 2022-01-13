/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import pLimit from 'p-limit';
import Path from 'path';
import { Worker } from 'worker_threads';
import { getCommonServices } from './get_common_services';
import { RunOptions } from './parse_run_cli_flags';
import { WorkerData } from './upload_next_batch';

export async function startHistoricalDataUpload({
  from,
  to,
  intervalInMs,
  bucketSizeInMs,
  workers,
  clientWorkers,
  batchSize,
  logLevel,
  target,
  file,
  writeTarget,
}: RunOptions & { from: number; to: number }) {
  let requestedUntil: number = from;

  const { logger } = getCommonServices({ target, logLevel });

  function processNextBatch() {
    const bucketFrom = requestedUntil;
    const bucketTo = Math.min(to, bucketFrom + bucketSizeInMs);

    if (bucketFrom === bucketTo) {
      return;
    }

    requestedUntil = bucketTo;

    logger.info(
      `Starting worker for ${new Date(bucketFrom).toISOString()} to ${new Date(
        bucketTo
      ).toISOString()}`
    );

    const workerData: WorkerData = {
      bucketFrom,
      bucketTo,
      file,
      logLevel,
      batchSize,
      bucketSizeInMs,
      clientWorkers,
      intervalInMs,
      target,
      workers,
      writeTarget,
    };

    const worker = new Worker(Path.join(__dirname, './upload_next_batch.js'), {
      workerData,
    });

    logger.perf('created_worker', () => {
      return new Promise<void>((resolve, reject) => {
        worker.on('online', () => {
          resolve();
        });
      });
    });

    logger.perf('completed_worker', () => {
      return new Promise<void>((resolve, reject) => {
        worker.on('exit', () => {
          resolve();
        });
      });
    });

    return new Promise<void>((resolve, reject) => {
      worker.on('error', (err) => {
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped: exit code ${code}`));
          return;
        }
        logger.debug('Worker completed');
        resolve();
      });
    });
  }

  const numBatches = Math.ceil((to - from) / bucketSizeInMs);

  const limiter = pLimit(workers);

  return Promise.all(new Array(numBatches).fill(undefined).map((_) => limiter(processNextBatch)));
}
