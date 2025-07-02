/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parentPort, workerData } from 'worker_threads';
import { bootstrap } from './bootstrap';
import { indexHistoricalData } from './index_historical_data';
import { loggerProxy } from './logger_proxy';
import { RunOptions } from './parse_run_cli_flags';
import { StreamManager } from './stream_manager';

export interface WorkerData {
  from: number;
  to: number;
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
  workerId: string;
}

const { bucketFrom, bucketTo, runOptions, workerId, from, to } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;

  const streamManager = new StreamManager(logger);

  const { clients } = await bootstrap({
    ...runOptions,
    skipClientBootstrap: true,
    clean: false,
  });

  await indexHistoricalData({
    bucketFrom,
    bucketTo,
    clients,
    logger,
    runOptions,
    workerId,
    from,
    to,
    streamManager,
  });
}

parentPort!.on('message', (message) => {
  if (message !== 'start') {
    return;
  }

  start()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      loggerProxy.error(err);
      process.exit(1);
    });
});
