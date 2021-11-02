/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';
import { Scenario } from './get_scenario';
import { Logger } from './logger';
import { uploadEvents } from './upload_events';

export async function startHistoricalDataUpload({
  from,
  to,
  scenario,
  intervalInMs,
  bucketSizeInMs,
  client,
  workers,
  writeTargets,
  logger,
}: {
  from: number;
  to: number;
  scenario: Scenario;
  intervalInMs: number;
  bucketSizeInMs: number;
  client: Client;
  workers: number;
  writeTargets: ElasticsearchOutputWriteTargets;
  logger: Logger;
}) {
  let requestedUntil: number = from;
  function uploadNextBatch() {
    const bucketFrom = requestedUntil;
    const bucketTo = Math.min(to, bucketFrom + bucketSizeInMs);

    const events = scenario({ from: bucketFrom, to: bucketTo });

    logger.info(
      `Uploading: ${new Date(bucketFrom).toISOString()} to ${new Date(bucketTo).toISOString()}`
    );

    uploadEvents({
      events,
      client,
      workers,
      writeTargets,
      logger,
    }).then(() => {
      if (bucketTo >= to) {
        return;
      }
      uploadNextBatch();
    });

    requestedUntil = bucketTo;
  }

  return uploadNextBatch();
}
