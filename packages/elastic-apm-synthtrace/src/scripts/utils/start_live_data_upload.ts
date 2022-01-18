/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import { getScenario } from './get_scenario';
import { uploadEvents } from './upload_events';
import { RunOptions } from './parse_run_cli_flags';
import { getCommonServices } from './get_common_services';
import { ElasticsearchOutput } from '../../lib/utils/to_elasticsearch_output';

export async function startLiveDataUpload({
  file,
  start,
  bucketSizeInMs,
  intervalInMs,
  clientWorkers,
  batchSize,
  target,
  logLevel,
  workers,
  writeTarget,
  scenarioOpts,
}: RunOptions & { start: number }) {
  let queuedEvents: ElasticsearchOutput[] = [];
  let requestedUntil: number = start;

  const { logger, client } = getCommonServices({ target, logLevel });

  const scenario = await getScenario({ file, logger });
  const { generate } = await scenario({
    batchSize,
    bucketSizeInMs,
    clientWorkers,
    file,
    intervalInMs,
    logLevel,
    target,
    workers,
    writeTarget,
    scenarioOpts,
  });

  function uploadNextBatch() {
    const end = new Date().getTime();
    if (end > requestedUntil) {
      const bucketFrom = requestedUntil;
      const bucketTo = requestedUntil + bucketSizeInMs;
      const nextEvents = generate({ from: bucketFrom, to: bucketTo });
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
      (event) => event.timestamp <= end
    );

    logger.info(`Uploading until ${new Date(end).toISOString()}, events: ${eventsToUpload.length}`);

    queuedEvents = eventsToRemainInQueue;

    uploadEvents({
      events: eventsToUpload,
      clientWorkers,
      batchSize,
      logger,
      client,
    });
  }

  setInterval(uploadNextBatch, intervalInMs);

  uploadNextBatch();
}
