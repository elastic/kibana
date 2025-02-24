/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange } from '@kbn/apm-synthtrace-client';
import { castArray } from 'lodash';
import { PassThrough, Readable, Writable } from 'stream';
import { isGeneratorObject } from 'util/types';
import { SynthtraceEsClient } from '../../lib/shared/base_client';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { bootstrap } from './bootstrap';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';

export async function startLiveDataUpload({
  runOptions,
  start,
}: {
  runOptions: RunOptions;
  start: Date;
}) {
  const file = runOptions.file;

  const {
    logger,
    apmEsClient,
    logsEsClient,
    infraEsClient,
    syntheticsEsClient,
    otelEsClient,
    entitiesEsClient,
    entitiesKibanaClient,
  } = await bootstrap(runOptions);

  const scenario = await getScenario({ file, logger });
  const {
    generate,
    bootstrap: scenarioBootsrap,
    teardown: scenarioTearDown,
  } = await scenario({ ...runOptions, logger });

  if (scenarioBootsrap) {
    await scenarioBootsrap({
      apmEsClient,
      logsEsClient,
      infraEsClient,
      otelEsClient,
      syntheticsEsClient,
      entitiesEsClient,
      entitiesKibanaClient,
    });
  }

  const bucketSizeInMs = runOptions.liveBucketSize;
  let requestedUntil = start;

  let currentStreams: PassThrough[] = [];
  // @ts-expect-error upgrade typescript v4.9.5
  const cachedStreams: WeakMap<SynthtraceEsClient, PassThrough> = new WeakMap();

  process.on('SIGINT', () => closeStreamsAndTeardown());
  process.on('SIGTERM', () => closeStreamsAndTeardown());
  process.on('SIGQUIT', () => closeStreamsAndTeardown());

  async function closeStreamsAndTeardown() {
    if (scenarioTearDown) {
      try {
        await scenarioTearDown({
          apmEsClient,
          logsEsClient,
          infraEsClient,
          otelEsClient,
          syntheticsEsClient,
          entitiesEsClient,
          entitiesKibanaClient,
        });
      } catch (error) {
        logger.error('Error during scenario teardown', error);
      }
    }

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
        clients: {
          logsEsClient,
          apmEsClient,
          infraEsClient,
          entitiesEsClient,
          syntheticsEsClient,
          otelEsClient,
        },
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
