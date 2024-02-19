/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { parentPort, workerData } from 'worker_threads';
import pidusage from 'pidusage';
import { castArray } from 'lodash';
import { memoryUsage } from 'process';
import { timerange } from '@kbn/apm-synthtrace-client';
import { getApmEsClient } from './get_apm_es_client';
import { getScenario } from './get_scenario';
import { loggerProxy } from './logger_proxy';
import { RunOptions } from './parse_run_cli_flags';
import { getLogsEsClient } from './get_logs_es_client';
import { getInfraEsClient } from './get_infra_es_client';

export interface WorkerData {
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
  workerId: string;
  esUrl: string;
  version: string;
}

const { bucketFrom, bucketTo, runOptions, esUrl, version } = workerData as WorkerData;

async function start() {
  const logger = loggerProxy;
  const apmEsClient = getApmEsClient({
    concurrency: runOptions.concurrency,
    target: esUrl,
    logger,
    version,
  });

  const logsEsClient = getLogsEsClient({
    concurrency: runOptions.concurrency,
    target: esUrl,
    logger,
  });

  const infraEsClient = getInfraEsClient({
    concurrency: runOptions.concurrency,
    target: esUrl,
    logger,
  });

  const file = runOptions.file;

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  logger.info(`Running scenario from ${bucketFrom.toISOString()} to ${bucketTo.toISOString()}`);

  const { generate, bootstrap } = await scenario({ ...runOptions, logger });

  if (bootstrap) {
    await bootstrap({
      apmEsClient,
      logsEsClient,
      infraEsClient,
    });
  }

  logger.debug('Generating scenario');

  const generatorsAndClients = logger.perf('generate_scenario', () =>
    generate({
      range: timerange(bucketFrom, bucketTo),
      clients: { logsEsClient, apmEsClient, infraEsClient },
    })
  );

  const generatorsAndClientsArray = castArray(generatorsAndClients);

  logger.debug('Indexing scenario');

  function mb(value: number): string {
    return Math.round(value / 1024 ** 2).toString() + 'mb';
  }

  setInterval(async () => {
    const stats = await pidusage(process.pid);
    const mem = memoryUsage();
    logger.info(`cpu: ${stats.cpu}, memory: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`);
  }, 5000);

  await logger.perf('index_scenario', async () => {
    const promises = generatorsAndClientsArray.map(async ({ client, generator }) => {
      await client.index(generator);
      await client.refresh();
    });

    await Promise.all(promises);
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
