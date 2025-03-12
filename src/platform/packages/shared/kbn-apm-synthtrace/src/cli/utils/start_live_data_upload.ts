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
  from: number;
  to: number;
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

  if (scenarioBootstrap) {
    await scenarioBootstrap(clients);
  }

  const bucketSizeInMs = runOptions.liveBucketSize;
  let requestedUntil = from;

  async function uploadNextBatch() {
    const now = Date.now();

    if (now > requestedUntil) {
      const bucketCount = Math.floor((now - requestedUntil) / bucketSizeInMs);

      const rangeStart = requestedUntil;
      const rangeEnd = rangeStart + bucketCount * bucketSizeInMs;

      logger.info(
        `Requesting ${new Date(rangeStart).toISOString()} to ${new Date(
          rangeEnd
        ).toISOString()} in ${bucketCount} bucket(s)`
      );

      const generatorsAndClients = castArray(
        generate({
          range: timerange(rangeStart, rangeEnd, logger),
          clients,
        })
      );

      await Promise.all(
        generatorsAndClients.map(async ({ generator, client }) => {
          await streamManager.index(client, generator);
        })
      );

      logger.debug('Indexing completed');

      const refreshPromise = generatorsAndClients.map(async ({ client }) => {
        await client.refresh();
      });

      await Promise.all(refreshPromise);

      logger.debug('Refreshing completed');

      requestedUntil = rangeEnd;
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
