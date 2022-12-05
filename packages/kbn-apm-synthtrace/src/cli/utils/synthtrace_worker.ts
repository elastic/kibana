/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { parentPort, workerData } from 'worker_threads';
import { Fields } from '../../..';
import { timerange } from '../../lib/timerange';
import { LogLevel } from '../../lib/utils/create_logger';
import { Scenario } from '../scenario';
import { getCommonServices } from './get_common_services';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';

// logging proxy to main thread, ensures we see real time logging
const loggerProxy = {
  perf: <T extends any>(name: string, cb: () => T): T => {
    return cb();
  },
  debug: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.debug, args }),
  info: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.info, args }),
  error: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.error, args }),
};

export interface WorkerData {
  bucketFrom: Date;
  bucketTo: Date;
  runOptions: RunOptions;
  workerIndex: number;
  version: string;
}

const { bucketFrom, bucketTo, runOptions } = workerData as WorkerData;

const { logger, apmEsClient } = getCommonServices(runOptions, loggerProxy);
const file = runOptions.file;
let scenario: Scenario<Fields>;
let generators: ReturnType<Awaited<ReturnType<Scenario<Fields>>>['generate']>;

async function setup() {
  scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));
  const { generate } = await scenario(runOptions);

  generators = logger.perf('generate_scenario', () =>
    generate({ range: timerange(bucketFrom, bucketTo) })
  );
}

async function doWork() {
  await logger.perf('index_scenario', async () => {
    await apmEsClient.index(generators);
  });
}

parentPort!.on('message', async (message) => {
  if (message === 'setup') {
    await setup();
  }
  if (message === 'start') {
    try {
      await doWork();
      process.exit(0);
    } catch (error) {
      loggerProxy.info(error);
      process.exit(2);
    }
  }
});
