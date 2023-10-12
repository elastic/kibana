/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { timerange } from '@kbn/apm-synthtrace-client';
import { castArray } from 'lodash';
import { PassThrough, Readable, Writable } from 'stream';
import { isGeneratorObject } from 'util/types';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { bootstrap } from './bootstrap';
import { getScenario } from './get_scenario';
import { createConfig, getScenarioFromSchedule } from './get_config';
import { RunOptions } from './parse_run_cli_flags';

export async function startLiveDataUpload({
  runOptions,
  start,
}: {
  runOptions: RunOptions;
  start: Date;
}) {
  const file = runOptions.file;
  const configFile = runOptions.config;

  const { logger, apmEsClient } = await bootstrap(runOptions);
  let generateFn;
  if (configFile) {
    const config = await createConfig(configFile);
    // get schedule and return startTs, end, template in an array
    // loop through the array and define scenario file based on the schedule template
    /**
      let scenarioFile;
      for (let schedule of compiledSchedule) {
        if (schedule.template === 'good') {
          scenarioFile = '../../scenarios/simple_trace.ts';
        } else if (schedule.template === 'bad') {
          scenarioFile = '../../scenarios/high_throughput.ts';
        } else if (schedule.template === 'good_and_bad') {
          scenarioFile = '../../scenarios/low_throughput.ts';
        }
        const scenario = await getScenario({ scenarioFile, logger });
        const { generate } = await scenario({ ...runOptions, logger });
        map schedule with a generate function
      }
     */
    const { generate } = await getScenarioFromSchedule(config, logger, runOptions);
    generateFn = generate;
  } else {
    const scenario = await getScenario({ file, logger });
    const { generate } = await scenario({ ...runOptions, logger });
    generateFn = generate;
  }

  const bucketSizeInMs = 1000 * 60;
  let requestedUntil = start;

  const stream = new PassThrough({
    objectMode: true,
  }).setMaxListeners(1000);

  apmEsClient.index(stream);

  function closeStream() {
    stream.end(() => {
      process.exit(0);
    });
  }

  process.on('SIGINT', closeStream);
  process.on('SIGTERM', closeStream);
  process.on('SIGQUIT', closeStream);

  // uploadNextBatchForScenario(scenario)
  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil.getTime()) {
      const bucketFrom = requestedUntil;
      const bucketTo = new Date(requestedUntil.getTime() + bucketSizeInMs);

      logger.info(
        `Requesting ${new Date(bucketFrom).toISOString()} to ${new Date(bucketTo).toISOString()}`
      );

      const next = logger.perf('execute_scenario', () =>
        generateFn({ range: timerange(bucketFrom.getTime(), bucketTo.getTime()) })
      );

      const concatenatedStream = castArray(next)
        .reverse()
        .reduce<Writable>((prev, current) => {
          const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
          return currentStream.pipe(prev);
        }, new PassThrough({ objectMode: true }));

      concatenatedStream.pipe(stream, { end: false });

      await awaitStream(concatenatedStream);

      await apmEsClient.refresh();

      requestedUntil = bucketTo;
    }
  }

  do {
    // forEach schedule uploadNextScheduledBatch(schedule)
    /*
     ** for (let schedule of compiledShedule)
     *   await uploadNextScheduledBatch(schedule)
     *
     *
     */
    await uploadNextBatch();
    await delay(bucketSizeInMs);
  } while (true);
}
async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
