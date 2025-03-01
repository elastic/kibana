/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange } from '@kbn/apm-synthtrace-client';
import { castArray } from 'lodash';
import { memoryUsage } from 'process';
import { parentPort, workerData } from 'worker_threads';
import { getScenario } from './get_scenario';
import { loggerProxy } from './logger_proxy';
import { RunOptions } from './parse_run_cli_flags';
import { bootstrap } from './bootstrap';

export interface WorkerData {
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
  workerId: string;
}

const { bucketFrom, bucketTo, runOptions } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;

  const { clients } = await bootstrap(runOptions);

  const file = runOptions.file;

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  logger.info(`Running scenario from ${bucketFrom.toISOString()} to ${bucketTo.toISOString()}`);

  const { generate, teardown } = await scenario({ ...runOptions, logger });

  logger.debug('Generating scenario');

  const generatorsAndClients = logger.perf('generate_scenario', () =>
    generate({
      range: timerange(bucketFrom, bucketTo),
      clients,
    })
  );

  const generatorsAndClientsArray = castArray(generatorsAndClients);

  logger.debug('Indexing scenario');

  function mb(value: number): string {
    return Math.round(value / 1024 ** 2).toString() + 'mb';
  }

  let cpuUsage = process.cpuUsage();

  setInterval(async () => {
    cpuUsage = process.cpuUsage(cpuUsage);
    const mem = memoryUsage();
    logger.info(
      `cpu time: (user: ${cpuUsage.user}µs, sys: ${cpuUsage.system}µs), memory: ${mb(
        mem.heapUsed
      )}/${mb(mem.heapTotal)}`
    );
  }, 5000);

  await logger.perf('index_scenario', async () => {
    const promises = generatorsAndClientsArray.map(async ({ client, generator }) => {
      await client.index(generator);
      await client.refresh();
    });

    await Promise.all(promises);
  });

  if (teardown) {
    await teardown({
      ...clients,
    });
  }
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
