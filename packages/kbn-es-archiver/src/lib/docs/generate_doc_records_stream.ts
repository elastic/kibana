/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import { Client } from '@elastic/elasticsearch';
import { Stats } from '../stats';
import { Progress } from '../progress';

const SCROLL_SIZE = 1000;
const SCROLL_TIMEOUT = '1m';

export function createGenerateDocRecordsStream({
  client,
  stats,
  progress,
  query,
}: {
  client: Client;
  stats: Stats;
  progress: Progress;
  query?: Record<string, any>;
}) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        const interator = client.helpers.scrollSearch({
          index,
          scroll: SCROLL_TIMEOUT,
          size: SCROLL_SIZE,
          _source: 'true',
          body: {
            query,
          },
          rest_total_hits_as_int: true,
        });

        let remainingHits: number | null = null;

        for await (const resp of interator) {
          if (remainingHits === null) {
            remainingHits = resp.body.hits.total as number;
            progress.addToTotal(remainingHits);
          }

          for (const hit of resp.body.hits.hits) {
            remainingHits -= 1;
            stats.archivedDoc(hit._index);
            this.push({
              type: 'doc',
              value: {
                // always rewrite the .kibana_* index to .kibana_1 so that
                // when it is loaded it can skip migration, if possible
                index: hit._index.startsWith('.kibana') ? '.kibana_1' : hit._index,
                type: hit._type,
                id: hit._id,
                source: hit._source,
                // not present on all documents, it only exists if set at indexing time.
                routing: hit._routing,
              },
            });
          }

          progress.addToComplete(resp.body.hits.hits.length);
        }

        callback(undefined);
      } catch (err) {
        callback(err);
      }
    },
  });
}
