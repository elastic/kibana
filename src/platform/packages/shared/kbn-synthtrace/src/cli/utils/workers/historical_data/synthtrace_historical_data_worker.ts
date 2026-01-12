/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parentPort, workerData } from 'worker_threads';
import { bootstrap } from '../../bootstrap';
import { indexData } from '../../index_data';
import { loggerProxy } from '../../logger_proxy';
import { StreamManager } from '../../stream_manager';
import type { BaseWorkerData } from '../types';

export type WorkerData = BaseWorkerData;

const { file, bucketFrom, bucketTo, runOptions, workerId, from, to } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;

  const streamManager = new StreamManager(logger);

  const { clients } = await bootstrap({
    ...runOptions,
    skipClientBootstrap: true,
    clean: false,
  });

  await indexData({
    file,
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
