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

export interface WorkerData {
  from: Date;
  to: Date;
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
  workerId: string;
}

const { bucketFrom, bucketTo, runOptions, workerId, from, to } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;

  const { clients } = await bootstrap({
    ...runOptions,
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
