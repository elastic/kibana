/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoryUsage } from 'process';
import { timerange } from '@kbn/apm-synthtrace-client';
import { Logger } from '../../lib/utils/create_logger';
import { SynthtraceClients } from './get_clients';
import { getScenario } from './get_scenario';
import { WorkerData } from './synthtrace_worker';
import { StreamManager } from './stream_manager';

export async function indexHistoricalData({
  bucketFrom,
  bucketTo,
  runOptions,
  workerId,
  logger,
  clientsByFile,
  from,
  to,
  streamManager,
}: WorkerData & {
  logger: Logger;
  clientsByFile: Map<string, SynthtraceClients>;
  streamManager: StreamManager;
}) {
  const files = runOptions.files;

  logger.info(
    `Running scenario from ${bucketFrom.toISOString()} to ${bucketTo.toISOString()} (pid: ${
      process.pid
    })`
  );

  const scenarios = await logger.perf('get_scenario', async () => {
    return Promise.all(
      files.map(async (file) => {
        const fn = await getScenario({ file, logger });
        const scenario = await fn({
          ...runOptions,
          logger,
          from,
          to,
        });

        const scenarioClients = clientsByFile.get(file);
        if (!scenarioClients) {
          throw new Error(`No clients found for file: ${file}`);
        }

        return { scenario, scenarioClients };
      })
    );
  });

  logger.debug('Generating scenario');

  const generatorsAndClients = logger.perf('generate_scenario', () =>
    scenarios.flatMap(({ scenario, scenarioClients }) => {
      return scenario.generate({
        range: timerange(bucketFrom, bucketTo, logger),
        clients: scenarioClients,
      });
    })
  );

  logger.debug('Indexing scenario');

  function mb(value: number): string {
    return Math.round(value / 1024 ** 2).toString() + 'mb';
  }

  let cpuUsage = process.cpuUsage();

  const intervalId = setInterval(async () => {
    cpuUsage = process.cpuUsage(cpuUsage);
    const mem = memoryUsage();
    logger.debug(
      `cpu time: (user: ${Math.round(cpuUsage.user / 1000)}mss, sys: ${Math.round(
        cpuUsage.system / 1000
      )}ms), memory: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`
    );
  }, 5000);

  await logger.perf('index_scenario', async () => {
    await Promise.all(
      generatorsAndClients.map(async ({ client, generator }) => {
        await streamManager.index(client, generator);
      })
    ).finally(async () => {
      await streamManager.teardown();
      clearInterval(intervalId);
    });
  });
}
