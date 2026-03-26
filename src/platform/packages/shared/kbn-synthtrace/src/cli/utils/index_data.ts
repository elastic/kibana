/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange } from '@kbn/synthtrace-client';
import { castArray } from 'lodash';
import type { Logger } from '../../lib/utils/create_logger';
import type { SynthtraceClients } from './clients_manager';
import { getScenario } from './get_scenario';
import type { BaseWorkerData } from './workers/types';
import type { StreamManager } from './stream_manager';
import { startPerformanceLogger } from './performance_logger';

export async function indexData({
  file,
  bucketFrom,
  bucketTo,
  runOptions,
  workerId,
  logger,
  clients,
  from,
  to,
  streamManager,
  autoTerminateStreams = true,
}: BaseWorkerData & {
  logger: Logger;
  clients: SynthtraceClients;
  streamManager: StreamManager;
  autoTerminateStreams?: boolean;
}) {
  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  logger.info(
    `Running scenario from ${bucketFrom.toISOString()} to ${bucketTo.toISOString()} (pid: ${
      process.pid
    })`
  );

  const { generate, setupPipeline } = await scenario({ ...runOptions, logger, from, to });

  logger.debug('Generating scenario');

  const generatorsAndClients = castArray(
    logger.perf('generate_scenario', () =>
      generate({
        range: timerange(bucketFrom, bucketTo, logger),
        clients,
      })
    )
  );

  if (setupPipeline) {
    setupPipeline(clients);
  }

  logger.debug('Indexing scenario');

  const stopPerformanceLogger = startPerformanceLogger({ logger });

  await logger.perf('index_scenario', async () => {
    await Promise.all(
      generatorsAndClients.map(async ({ client, generator }) => {
        await streamManager.index(client, generator);
      })
    ).finally(async () => {
      if (autoTerminateStreams) {
        await streamManager.teardown();
      }

      stopPerformanceLogger();
    });
  });

  return generatorsAndClients;
}
