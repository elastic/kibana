/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// add this to workerExample.js file.
import { Client } from '@elastic/elasticsearch';
import { workerData } from 'worker_threads';
import { getScenario } from './get_scenario';
import { createLogger, LogLevel } from '../../lib/utils/create_logger';
import { uploadEvents } from './upload_events';

export interface WorkerData {
  bucketFrom: number;
  bucketTo: number;
  file: string;
  logLevel: LogLevel;
  clientWorkers: number;
  batchSize: number;
  intervalInMs: number;
  bucketSizeInMs: number;
  target: string;
  workers: number;
  writeTarget?: string;
}

const {
  bucketFrom,
  bucketTo,
  file,
  logLevel,
  clientWorkers,
  batchSize,
  intervalInMs,
  bucketSizeInMs,
  workers,
  target,
  writeTarget,
} = workerData as WorkerData;

async function uploadNextBatch() {
  if (bucketFrom === bucketTo) {
    return;
  }

  const logger = createLogger(logLevel);
  const client = new Client({
    node: target,
  });

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const { generate } = await scenario({
    intervalInMs,
    bucketSizeInMs,
    logLevel,
    file,
    clientWorkers,
    batchSize,
    target,
    workers,
    writeTarget,
  });

  const events = logger.perf('execute_scenario', () =>
    generate({ from: bucketFrom, to: bucketTo })
  );

  return uploadEvents({
    events,
    client,
    clientWorkers,
    batchSize,
    logger,
  });
}

uploadNextBatch()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line
    console.log(error);
    // make sure error shows up in console before process is killed
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });
