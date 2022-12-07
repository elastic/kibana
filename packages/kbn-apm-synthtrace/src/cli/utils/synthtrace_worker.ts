/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { parentPort, workerData } from 'worker_threads';
import { timerange } from '../../lib/timerange';
import { getCommonServices } from './get_common_services';
import { getScenario } from './get_scenario';
import { loggerProxy } from './logger_proxy';
import { RunOptions } from './parse_run_cli_flags';

export interface WorkerData {
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
}

const { bucketFrom, bucketTo, runOptions } = workerData as WorkerData;

async function start() {
  const { logger, apmEsClient } = await getCommonServices(runOptions, loggerProxy);

  const file = runOptions.file;

  const scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));

  logger.debug('Running scenario');

  const { generate } = await scenario({ ...runOptions, logger });

  logger.debug('Generating scenario');

  const generators = logger.perf('generate_scenario', () =>
    generate({ range: timerange(bucketFrom, bucketTo) })
  );

  logger.debug('Indexing scenario');

  await logger.perf('index_scenario', async () => {
    await apmEsClient.index(generators);
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
