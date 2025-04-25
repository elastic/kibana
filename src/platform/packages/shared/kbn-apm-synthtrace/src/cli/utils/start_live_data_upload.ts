/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { once } from 'lodash';
import { Worker } from 'worker_threads';
import { bootstrap } from './bootstrap';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';
import { StreamManager } from './stream_manager';
import { SynthtraceEsClient } from '../../lib/shared/base_client';
import { WorkerData } from './workers/live_data/synthtrace_live_data_worker';
import { LogLevel } from '../../lib/utils/create_logger';
import { SynthtraceClients } from './get_clients';
import { startPerformanceLogger } from './performance_logger';

export async function startLiveDataUpload({
  runOptions,
  from,
  to,
}: {
  runOptions: RunOptions;
  from: number;
  to: number;
}) {
  const files = runOptions.files;

  const clientsPerIndices = new Map<string, string>();

  const { logger, clients } = await bootstrap(runOptions);

  Object.entries(clients).forEach(([key, client]) => {
    if (client instanceof SynthtraceEsClient) {
      clientsPerIndices.set(client.getAllIndices().join(','), key);
    }
  });

  const scenarios = await Promise.all(
    files.map(async (file) => {
      const fn = await getScenario({ file, logger });
      return fn({
        ...runOptions,
        logger,
        from,
        to,
      });
    })
  );

  const stopPerformanceLogger = startPerformanceLogger({ logger });

  const teardown = once(async () => {
    await Promise.all(
      scenarios.map((scenario) => {
        if (scenario.teardown) {
          return scenario.teardown(clients);
        }
      })
    );

    stopPerformanceLogger();
  });

  const streamManager = new StreamManager(logger, teardown);

  await Promise.all(
    scenarios.map((scenario) => {
      if (scenario.bootstrap) {
        return scenario.bootstrap(clients);
      }
    })
  );

  const bucketSizeInMs = runOptions.liveBucketSize;

  const workersWaitingRefresh = new Map<string, string>();

  function refreshIndices() {
    return Promise.all(
      [...new Set(workersWaitingRefresh.values())].map(async (indices) => {
        if (!indices) return;

        const clientName = clientsPerIndices.get(indices);
        const client = clientName && clients[clientName as keyof SynthtraceClients];

        if (client instanceof SynthtraceEsClient) {
          await client.refresh();
        }
      })
    );
  }

  function runService({ file, workerIndex }: { file: string; workerIndex: number }) {
    return new Promise((resolve, reject) => {
      logger.debug(`Setting up Worker: ${workerIndex}`);
      const workerData: WorkerData = {
        file,
        runOptions,
        bucketSizeInMs,
        workerId: workerIndex.toString(),
        from,
        to,
      };
      const worker = new Worker(Path.join(__dirname, './workers/live_data/worker.js'), {
        workerData,
      });

      streamManager.trackWorker(worker);

      worker.on('message', async (message) => {
        if ('status' in message && message.status === 'done') {
          const { workerId, indicesToRefresh }: { workerId: string; indicesToRefresh: string[] } =
            message;

          if (!workersWaitingRefresh.has(workerId)) {
            workersWaitingRefresh.set(workerId, indicesToRefresh.join(','));
          }

          if (workersWaitingRefresh.size === files.length) {
            await refreshIndices();
            logger.debug('Refreshing completed');

            streamManager.trackedWorkers.forEach((trackedWorker) => {
              trackedWorker.postMessage('continue');
            });

            workersWaitingRefresh.clear();
          }
        } else {
          const [logLevel, msg]: [string, string] = message;
          switch (logLevel) {
            case LogLevel.debug:
              logger.debug(msg);
              return;
            case LogLevel.info:
              logger.info(msg);
              return;
            case LogLevel.verbose:
              logger.verbose(msg);
              return;
            case LogLevel.warn:
              logger.warning(msg);
              return;
            case LogLevel.error:
              logger.error(msg);
              return;
            default:
              logger.info(msg);
          }
        }
      });
      worker.on('error', (message) => {
        logger.error(message);
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

  const workerServices = files.map((file, index) => runService({ file, workerIndex: index }));

  await Promise.race(workerServices);
}
