/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Client } from '@elastic/elasticsearch';
import pLimit from 'p-limit';
import Path from 'path';
import { Worker } from 'worker_threads';
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';
import { Logger, LogLevel } from './logger';

export async function startHistoricalDataUpload({
  from,
  to,
  bucketSizeInMs,
  workers,
  clientWorkers,
  batchSize,
  writeTargets,
  logLevel,
  logger,
  target,
  file,
}: {
  from: number;
  to: number;
  bucketSizeInMs: number;
  client: Client;
  workers: number;
  clientWorkers: number;
  batchSize: number;
  writeTargets: ElasticsearchOutputWriteTargets;
  logger: Logger;
  logLevel: LogLevel;
  target: string;
  file: string;
}) {
  let requestedUntil: number = from;

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

    const worker = new Worker(Path.join(__dirname, './upload_next_batch.js'), {
      workerData: {
        bucketFrom,
        bucketTo,
        logLevel,
        writeTargets,
        target,
        file,
        clientWorkers,
        batchSize,
      },
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
