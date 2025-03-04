/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange } from '@kbn/apm-synthtrace-client';
import { castArray, once } from 'lodash';
import { PassThrough, Readable, Writable } from 'stream';
import { isGeneratorObject } from 'util/types';
import { SynthtraceEsClient } from '../../lib/shared/base_client';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { bootstrap } from './bootstrap';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';
import { StreamManager } from './stream_manager';

export async function startLiveDataUpload({
  runOptions,
  from,
  to,
}: {
  runOptions: RunOptions;
  from: Date;
  to: Date;
}) {
  const file = runOptions.file;

  const { logger, clients } = await bootstrap(runOptions);

  const scenario = await getScenario({ file, logger });
  const {
    generate,
    bootstrap: scenarioBootstrap,
    teardown: scenarioTearDown,
  } = await scenario({ ...runOptions, logger, from, to });

  const teardown = once(async () => {
    if (scenarioTearDown) {
      await scenarioTearDown(clients);
    }
  });

  const streamManager = new StreamManager(logger, teardown);

  streamManager.init();

  if (scenarioBootstrap) {
    await scenarioBootstrap(clients);
  }

  const bucketSizeInMs = runOptions.liveBucketSize;
  let requestedUntil = from;

  // @ts-expect-error upgrade typescript v4.9.5
  const cachedStreams: WeakMap<SynthtraceEsClient, PassThrough> = new WeakMap();

  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil.getTime()) {
      const bucketCount = Math.floor((now - requestedUntil.getTime()) / bucketSizeInMs);

      const rangeStart = requestedUntil.getTime();
      const rangeEnd = rangeStart + bucketCount * bucketSizeInMs;

      logger.info(
        `Requesting ${new Date(rangeStart).toISOString()} to ${new Date(
          rangeEnd
        ).toISOString()} in ${bucketCount} bucket(s)`
      );

      const generatorsAndClients = generate({
        range: timerange(rangeStart, rangeEnd, logger),
        clients,
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

      streams.forEach((stream) => streamManager.trackStream(stream));

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

      streams.forEach((stream) => streamManager.untrackStream(stream));

      logger.info('Refreshing completed');

      requestedUntil = new Date(rangeEnd);
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
