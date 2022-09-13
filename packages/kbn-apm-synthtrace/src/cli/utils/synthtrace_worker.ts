/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import pLimit from 'p-limit';
import { workerData, parentPort } from 'worker_threads';
import { ScenarioOptions } from './get_scenario_options';
import { getScenario } from './get_scenario';
import { StreamToBulkOptions } from '../../lib/client/synthtrace_es_client';
import { getCommonServices } from './get_common_services';
import { LogLevel } from '../../lib/utils/create_logger';
import { StreamProcessor } from '../../lib/streaming/stream_processor';
import { ScenarioDescriptor } from '../scenario';
import { SignalIterable, Fields } from '../../..';
import { getStreamProcessorOptions } from './get_stream_processor_options';

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
  options: ScenarioOptions;
  workerIndex: number;
  version: string;
}

const { bucketFrom, bucketTo, options, workerIndex, version } = workerData as WorkerData;

const { logger, apmEsClient, apmIntakeClient } = getCommonServices(options, l);
let scenario: ScenarioDescriptor<Fields>;
let events: SignalIterable<Fields>;
let streamToBulkOptions: StreamToBulkOptions<Fields>;
let streamProcessor: StreamProcessor<Fields>;

async function setup() {
  scenario = await getScenario({ logger, options });
  const { generate, mapToIndex } = scenario;

  events = logger.perf('generate_scenario', () => generate({ from: bucketFrom, to: bucketTo }));
  streamToBulkOptions = {
    maxDocs: options.maxDocs,
    mapToIndex,
    dryRun: !!options.dryRun,
  };
  streamToBulkOptions.itemStartStopCallback = (item, done) => {
    if (!item) return;
    if (!done) {
      parentPort?.postMessage({ workerIndex, firstTimestamp: item['@timestamp'] });
    } else {
      parentPort?.postMessage({ workerIndex, lastTimestamp: item['@timestamp'] });
    }
  };
  // If we are sending data to apm-server we do not have to create any aggregates in the stream processor
  const streamProcessorOptions = getStreamProcessorOptions(
    `Worker ${workerIndex}`,
    logger,
    version,
    options,
    scenario
  );
  streamProcessorOptions.processedCallback = (processedDocuments) => {
    parentPort!.postMessage({ workerIndex, processedDocuments });
  };
  streamProcessor = new StreamProcessor(streamProcessorOptions);
}

async function doWork() {
  await logger.perf('index_scenario', async () => {
    if (apmIntakeClient) {
      await apmIntakeClient.index(events, streamProcessor, streamToBulkOptions);
    } else {
      await apmEsClient.index(events, streamProcessor, streamToBulkOptions);
    }
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
      l.info(error);
      process.exit(2);
    }
  }
});
