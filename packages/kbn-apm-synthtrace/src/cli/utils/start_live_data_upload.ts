/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { castArray } from 'lodash';
import { PassThrough, Readable, Writable } from 'stream';
import { isGeneratorObject } from 'util/types';
import { ApmSynthtraceEsClient } from '../../lib/apm';
import { timerange } from '../../lib/timerange';
import { Logger } from '../../lib/utils/create_logger';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';

export async function startLiveDataUpload({
  esClient,
  logger,
  runOptions,
  start,
}: {
  esClient: ApmSynthtraceEsClient;
  logger: Logger;
  runOptions: RunOptions;
  start: Date;
}) {
  const file = runOptions.file;

  const scenario = await getScenario({ file, logger });
  const { generate } = await scenario(runOptions);

  const bucketSizeInMs = 1000 * 60;
  let requestedUntil = start;

  const stream = new PassThrough({
    objectMode: true,
  });

  esClient.index(stream);

  function closeStream() {
    stream.end(() => {
      process.exit(0);
    });
  }

  process.on('SIGINT', closeStream);
  process.on('SIGTERM', closeStream);
  process.on('SIGQUIT', closeStream);

  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil.getTime()) {
      const bucketFrom = requestedUntil;
      const bucketTo = new Date(requestedUntil.getTime() + bucketSizeInMs);

      logger.info(
        `Requesting ${new Date(bucketFrom).toISOString()} to ${new Date(bucketTo).toISOString()}`
      );

      const next = logger.perf('execute_scenario', () =>
        generate({ range: timerange(bucketFrom.getTime(), bucketTo.getTime()) })
      );

      const concatenatedStream = castArray(next)
        .reverse()
        .reduce<Writable>((prev, current) => {
          const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
          return currentStream.pipe(prev);
        }, new PassThrough({ objectMode: true }));

      concatenatedStream.pipe(stream, { end: false });

      await awaitStream(concatenatedStream);

      await esClient.refresh();

      requestedUntil = bucketTo;
    }
  }

  do {
    await uploadNextBatch();
    await delay(bucketSizeInMs);
  } while (true);
}
async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
