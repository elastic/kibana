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
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';
import { getScenario } from './get_scenario';
import { createLogger, LogLevel } from './logger';
import { uploadEvents } from './upload_events';

const { bucketFrom, bucketTo, file, logLevel, target, writeTargets, clientWorkers, batchSize } =
  workerData as {
    bucketFrom: number;
    bucketTo: number;
    file: string;
    logLevel: LogLevel;
    target: string;
    writeTargets: ElasticsearchOutputWriteTargets;
    clientWorkers: number;
    batchSize: number;
  };

async function uploadNextBatch() {
  if (bucketFrom === bucketTo) {
    return;
  }

  const logger = createLogger(logLevel);
  const client = new Client({
    node: target,
  });

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  const events = logger.perf('execute_scenario', () =>
    scenario({ from: bucketFrom, to: bucketTo })
  );

  return uploadEvents({
    events,
    client,
    clientWorkers,
    batchSize,
    writeTargets,
    logger,
  });
}

uploadNextBatch()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
