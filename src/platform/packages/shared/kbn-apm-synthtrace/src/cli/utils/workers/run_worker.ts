/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'worker_threads';
import { Logger } from '../../../lib/utils/create_logger';
import { StreamManager } from '../stream_manager';
import { logMessage } from './log_message';

interface WorkerServiceOptions<TWorkerData> {
  logger: Logger;
  streamManager: StreamManager;
  workerIndex: number;
  workerScriptPath: string;

  workerData: TWorkerData;
  onMessage?: (message: any) => void;
}

export function runWorker<TWorkerData>({
  workerIndex,
  workerScriptPath,
  streamManager,
  workerData,
  onMessage,
  logger,
}: WorkerServiceOptions<TWorkerData>) {
  return new Promise((resolve, reject) => {
    logger.debug(`Setting up Worker: ${workerIndex}`);

    const worker = new Worker(workerScriptPath, { workerData });

    streamManager.trackWorker(worker);

    worker.on('message', (message) => {
      if (onMessage) {
        onMessage(message);
      } else {
        logMessage(logger, message);
      }
    });

    worker.on('error', (error) => {
      logger.error(error);
      reject();
    });

    worker.on('exit', (code) => {
      if (code === 2) reject(new Error(`Worker ${workerIndex} exited with error: ${code}`));
      if (code === 1) {
        logger.info(`Worker ${workerIndex} exited early because cancellation was requested`);
      }
      resolve(null);
    });

    worker.postMessage('start');
  });
}
