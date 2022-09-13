/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import { getScenario } from './get_scenario';
import { ScenarioOptions } from './get_scenario_options';
import { SynthtraceEsClient } from '../../lib/apm';
import { Logger } from '../../lib/utils/create_logger';
import { SignalArrayIterable } from '../../lib/streaming/signal_iterable';
import { StreamProcessor } from '../../lib/streaming/stream_processor';
import { ApmSynthtraceApmClient } from '../../lib/apm/client/apm_synthtrace_apm_client';
import { Fields } from '../../dsl/fields';
import { getStreamProcessorOptions } from './get_stream_processor_options';

export async function startLiveDataUpload(
  esClient: SynthtraceEsClient,
  apmIntakeClient: ApmSynthtraceApmClient | null,
  logger: Logger,
  options: ScenarioOptions,
  start: Date,
  version: string
) {
  const scenario = await getScenario({ logger, options });
  const { generate, mapToIndex } = scenario;

  let queuedEvents: Fields[] = [];
  let requestedUntil: Date = start;
  const bucketSizeInMs = 1000 * 60;

  async function uploadNextBatch() {
    const end = new Date();
    if (end > requestedUntil) {
      const bucketFrom = requestedUntil;
      const bucketTo = new Date(requestedUntil.getTime() + bucketSizeInMs);
      // TODO this materializes into an array, assumption is that the live buffer will fit in memory
      const nextEvents = logger.perf('execute_scenario', () =>
        generate({ from: bucketFrom, to: bucketTo }).toArray()
      );

      logger.info(
        `Requesting ${new Date(bucketFrom).toISOString()} to ${new Date(
          bucketTo
        ).toISOString()}, events: ${nextEvents.length}`
      );
      queuedEvents.push(...nextEvents);
      requestedUntil = bucketTo;
    }

    const [eventsToUpload, eventsToRemainInQueue] = partition(
      queuedEvents,
      (event) => event['@timestamp'] !== undefined && event['@timestamp'] <= end.getTime()
    );

    logger.info(`Uploading until ${new Date(end).toISOString()}, events: ${eventsToUpload.length}`);

    queuedEvents = eventsToRemainInQueue;
    const streamProcessorOptions = getStreamProcessorOptions(
      `Live index`,
      logger,
      version,
      options,
      scenario
    );
    const streamProcessor = new StreamProcessor(streamProcessorOptions);
    await logger.perf('index_live_scenario', async () => {
      const events = new SignalArrayIterable(eventsToUpload);
      const streamToBulkOptions = {
        concurrency: options.workers,
        maxDocs: options.maxDocs,
        mapToIndex,
        dryRun: false,
      };
      if (apmIntakeClient) {
        await apmIntakeClient.index(events, streamProcessor, streamToBulkOptions);
      } else {
        await esClient.index(events, streamProcessor, streamToBulkOptions);
      }
    });
  }

  do {
    await uploadNextBatch();
    await delay(bucketSizeInMs);
  } while (true);
}
async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
