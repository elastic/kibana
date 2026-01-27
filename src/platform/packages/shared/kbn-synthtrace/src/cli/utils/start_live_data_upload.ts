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
import { bootstrap } from './bootstrap';
import { getScenario } from './get_scenario';
import type { RunOptions } from './parse_run_cli_flags';
import { StreamManager } from './stream_manager';
import type { SynthtraceClientTypes } from './clients_manager';
import { startPerformanceLogger } from './performance_logger';
import { runWorker } from './workers/run_worker';
import { logMessage } from './workers/log_message';
import type { WorkerData } from './workers/live_data/synthtrace_live_data_worker';

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

  const clientsPerIndices = new Map<string, SynthtraceClientTypes>();

  const { logger, clients, kibanaClient, esClient } = await bootstrap(runOptions);

  Object.entries(clients).forEach(([key, client]) => {
    clientsPerIndices.set(client.getAllIndices().join(','), key as SynthtraceClientTypes);
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
          return scenario.teardown(clients, kibanaClient, esClient);
        }
      })
    );

    stopPerformanceLogger();
  });

  const streamManager = new StreamManager(logger, teardown);

  await Promise.all(
    scenarios.map((scenario) => {
      if (scenario.bootstrap) {
        return scenario.bootstrap(clients, kibanaClient, esClient);
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
        const client = clientName ? clients[clientName] : undefined;

        await client?.refresh();
      })
    );
  }

  async function onMessage(message: any) {
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
      logMessage(logger, message);
    }
  }

  const workerServices = files.map((file, index) =>
    runWorker<WorkerData>({
      logger,
      streamManager,
      workerIndex: index,
      workerScriptPath: Path.join(__dirname, './workers/live_data/worker.js'),
      workerData: {
        file,
        runOptions,
        bucketSizeInMs,
        workerId: index.toString(),
        from,
        to,
      },
      onMessage,
    })
  );

  await Promise.race(workerServices);
}
