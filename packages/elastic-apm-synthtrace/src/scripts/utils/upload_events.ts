/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Client } from '@elastic/elasticsearch';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { inspect } from 'util';
import { ElasticsearchOutput } from '../../lib/utils/to_elasticsearch_output';
import { Logger } from '../../lib/utils/create_logger';

export function uploadEvents({
  events,
  client,
  clientWorkers,
  batchSize,
  logger,
}: {
  events: ElasticsearchOutput[];
  client: Client;
  clientWorkers: number;
  batchSize: number;
  logger: Logger;
}) {
  const fn = pLimit(clientWorkers);

  const batches = chunk(events, batchSize);

  if (!batches.length) {
    return;
  }

  logger.debug(`Uploading ${events.length} in ${batches.length} batches`);

  const time = new Date().getTime();

  return Promise.all(
    batches.map((batch) =>
      fn(() => {
        return logger.perf('bulk_upload', () =>
          client.bulk({
            refresh: false,
            body: batch.flatMap((doc) => {
              return [{ index: { _index: doc._index } }, doc._source];
            }),
          })
        );
      })
    )
  ).then((results) => {
    const errors = results
      .flatMap((result) => result.items)
      .filter((item) => !!item.index?.error)
      .map((item) => item.index?.error);

    if (errors.length) {
      logger.error(inspect(errors.slice(0, 10), { depth: null }));
      throw new Error('Failed to upload some items');
    }

    logger.debug(`Uploaded ${events.length} in ${new Date().getTime() - time}ms`);
  });
}
