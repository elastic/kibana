/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { partition } from 'lodash';
import { Fields } from '../../lib/entity';
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';
import { Scenario } from './get_scenario';
import { Logger } from '../../lib/utils/create_logger';
import { uploadEvents } from './upload_events';

export function startLiveDataUpload({
  start,
  bucketSizeInMs,
  intervalInMs,
  clientWorkers,
  batchSize,
  writeTargets,
  scenario,
  client,
  logger,
}: {
  start: number;
  bucketSizeInMs: number;
  intervalInMs: number;
  clientWorkers: number;
  batchSize: number;
  writeTargets: ElasticsearchOutputWriteTargets;
  scenario: Scenario;
  client: Client;
  logger: Logger;
}) {
  let queuedEvents: Fields[] = [];
  let requestedUntil: number = start;

  function uploadNextBatch() {
    const end = new Date().getTime();
    if (end > requestedUntil) {
      const bucketFrom = requestedUntil;
      const bucketTo = requestedUntil + bucketSizeInMs;
      const nextEvents = scenario({ from: bucketFrom, to: bucketTo });
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
      (event) => event['@timestamp']! <= end
    );

    logger.info(`Uploading until ${new Date(end).toISOString()}, events: ${eventsToUpload.length}`);

    queuedEvents = eventsToRemainInQueue;

    uploadEvents({
      events: eventsToUpload,
      client,
      clientWorkers,
      batchSize,
      writeTargets,
      logger,
    });
  }

  setInterval(uploadNextBatch, intervalInMs);

  uploadNextBatch();
}
