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
import { RunOptions } from './parse_run_cli_flags';
import { SynthtraceEsClient } from '../../lib/utils/with_client';

export async function startLiveDataUpload({
  runOptions,
  start,
}: {
  runOptions: RunOptions;
  start: Date;
}) {
  const file = runOptions.file;

  const { logger, apmEsClient, logsEsClient, infraEsClient, assetsEsClient } = await bootstrap(
    runOptions
  );

  const scenario = await getScenario({ file, logger });
  const { generate } = await scenario({ ...runOptions, logger });

  const bucketSizeInMs = 1000 * 60;
  let requestedUntil = start;

  let currentStreams: PassThrough[] = [];
  const cachedStreams: WeakMap<SynthtraceEsClient, PassThrough> = new WeakMap();

  process.on('SIGINT', () => closeStreams());
  process.on('SIGTERM', () => closeStreams());
  process.on('SIGQUIT', () => closeStreams());

  function closeStreams() {
    currentStreams.forEach((stream) => {
      stream.end(() => {
        process.exit(0);
      });
    });
    currentStreams = []; // Reset the stream array
  }

  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil.getTime()) {
      const bucketFrom = requestedUntil;
      const bucketTo = new Date(requestedUntil.getTime() + bucketSizeInMs);

      logger.info(
        `Requesting ${new Date(bucketFrom).toISOString()} to ${new Date(bucketTo).toISOString()}`
      );

      const generatorsAndClients = generate({
        range: timerange(bucketFrom.getTime(), bucketTo.getTime()),
        clients: { logsEsClient, apmEsClient, infraEsClient, assetsEsClient },
      });

      const generatorsAndClientsArray = castArray(generatorsAndClients);

      const streams = generatorsAndClientsArray.map(({ client }) => {
        let stream: PassThrough;

        if (cachedStreams.has(client)) {
          stream = cachedStreams.get(client)!;
        } else {
          stream = new PassThrough({ objectMode: true });
          cachedStreams.set(client, stream);
          client.index(stream);
        }

        return stream;
      });

      currentStreams = streams;

      const promises = generatorsAndClientsArray.map(({ generator }, i) => {
        const concatenatedStream = castArray(generator)
          .reverse()
          .reduce<Writable>((prev, current) => {
            const currentStream = isGeneratorObject(current) ? Readable.from(current) : current;
            return currentStream.pipe(prev);
          }, new PassThrough({ objectMode: true }));

        concatenatedStream.pipe(streams[i], { end: false });

        return awaitStream(concatenatedStream);
      });

      await Promise.all(promises);

      logger.info('Indexing completed');

      const refreshPromise = generatorsAndClientsArray.map(async ({ client }) => {
        await client.refresh();
      });

      await Promise.all(refreshPromise);
      logger.info('Refreshing completed');

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
