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
import { BaseWorkerData } from '../types';

export interface WorkerData extends Omit<BaseWorkerData, 'bucketFrom' | 'bucketTo'> {
  bucketSizeInMs: number;
}

const { file, runOptions, workerId, from, to, bucketSizeInMs } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;
  logger.debug(`Worker ${workerId} started`);
  const streamManager = new StreamManager(logger);

  const { clients } = await bootstrap({
    ...runOptions,
    skipClientBootstrap: true,
    clean: false,
  });

  let requestedUntil = from;

  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil) {
      const bucketCount = Math.floor((now - requestedUntil) / bucketSizeInMs);

      const rangeStart = requestedUntil;
      const rangeEnd = rangeStart + bucketCount * bucketSizeInMs;

      logger.info(`Requesting ${bucketCount} bucket(s)`);

      const generatorsAndClients = await indexData({
        file,
        bucketFrom: new Date(rangeStart),
        bucketTo: new Date(rangeEnd),
        clients,
        logger,
        runOptions,
        workerId,
        from,
        to,
        streamManager,
        autoTerminateStreams: false,
      });

      requestedUntil = rangeEnd;

      return generatorsAndClients;
    }
  }

  do {
    const generatorsAndClients = await uploadNextBatch();

    logger.debug(
      `Worker ${workerId} - Indices to refresh: ${generatorsAndClients?.map(({ client }) =>
        client.getAllIndices().join(',')
      )}`
    );

    parentPort!.postMessage({
      status: 'done',
      workerId,
      indicesToRefresh: generatorsAndClients?.map(({ client }) => client.getAllIndices().join(',')),
    });

    logger.debug(`Worker ${workerId} is waiting for the main thread finish refreshing indices`);
    const continueMessage = await new Promise<string>((resolve) => {
      parentPort!.once('message', (message: string) => resolve(message));
    });

    if (continueMessage !== 'continue') {
      break;
    }

    await delay(bucketSizeInMs);
  } while (true);
}

parentPort!.on('message', (message) => {
  if (message !== 'start') {
    return;
  }

  start().catch((err) => {
    loggerProxy.error(err);
    process.exit(1);
  });
});

async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
