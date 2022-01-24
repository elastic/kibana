/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import { getScenario } from './get_scenario';
import { RunOptions } from './parse_run_cli_flags';
import { getCommonServices } from './get_common_services';
import { ApmFields } from '../../lib/apm/apm_fields';

export async function startLiveDataUpload(runOptions: RunOptions, start: Date) {
  const { logger, client } = getCommonServices(runOptions);

  const file = runOptions.file;
  const scenario = await getScenario({ file, logger });
  const { generate } = await scenario(runOptions);

  let queuedEvents: ApmFields[] = [];
  let requestedUntil: Date = start;

  async function uploadNextBatch() {
    const end = new Date();
    if (end > requestedUntil) {
      const bucketFrom = requestedUntil;
      const bucketTo = new Date(requestedUntil.getTime() + runOptions.bucketSizeInMs);
      // TODO this materializes into an array, assumption is that the live buffer will fit in memory
      const nextEvents = logger.perf('execute_scenario', () =>
        generate({ from: bucketFrom, to: bucketTo }).toArray()
      );

      logger.debug(
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

    await client.helpers.bulk<ApmFields>({
      datasource: eventsToUpload,
      onDocument: (doc) => {
        return { index: { _index: '' } };
      },
      concurrency: runOptions.clientWorkers,
    });
  }

  do {
    await uploadNextBatch();
    await delay(runOptions.intervalInMs);
  } while (true);
}
async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
