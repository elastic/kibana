/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import pLimit from 'p-limit';
import { workerData, parentPort } from 'worker_threads';
import { RunOptions } from './parse_run_cli_flags';
import { getScenario } from './get_scenario';
import { StreamToBulkOptions } from '../../lib/apm/client/apm_synthtrace_es_client';
import { getCommonServices } from './get_common_services';
import { LogLevel } from '../../lib/utils/create_logger';
import { StreamProcessor } from '../../lib/stream_processor';
import { Scenario } from '../scenario';
import { EntityIterable, Fields } from '../..';

// logging proxy to main thread, ensures we see real time logging
const l = {
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

const { bucketFrom, bucketTo, runOptions, workerIndex, version } = workerData as WorkerData;

const { logger, apmEsClient } = getCommonServices(runOptions, l);
const file = runOptions.file;
let scenario: Scenario<Fields>;
let events: EntityIterable<Fields>;
let streamToBulkOptions: StreamToBulkOptions;
let streamProcessor: StreamProcessor;

async function setup() {
  scenario = await logger.perf('get_scenario', () => getScenario({ file, logger }));
  const { generate, mapToIndex } = await scenario(runOptions);

  events = logger.perf('generate_scenario', () => generate({ from: bucketFrom, to: bucketTo }));
  streamToBulkOptions = {
    maxDocs: runOptions.maxDocs,
    mapToIndex,
    dryRun: !!runOptions.dryRun,
  };
  streamToBulkOptions.itemStartStopCallback = (item, done) => {
    if (!item) return;
    if (!done) {
      parentPort?.postMessage({ workerIndex, firstTimestamp: item['@timestamp'] });
    } else {
      parentPort?.postMessage({ workerIndex, lastTimestamp: item['@timestamp'] });
    }
  };
  streamProcessor = new StreamProcessor({
    version,
    processors: StreamProcessor.apmProcessors,
    maxSourceEvents: runOptions.maxDocs,
    logger: l,
    processedCallback: (processedDocuments) => {
      parentPort!.postMessage({ workerIndex, processedDocuments });
    },
    name: `Worker ${workerIndex}`,
  });
}

async function doWork() {
  await logger.perf(
    'index_scenario',
    async () => await apmEsClient.index(events, streamToBulkOptions, streamProcessor)
  );
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
      l.info(error);
      process.exit(2);
    }
  }
});
