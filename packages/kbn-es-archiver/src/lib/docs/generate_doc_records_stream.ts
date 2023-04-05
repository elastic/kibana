/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Stats } from '../stats';
import { Progress } from '../progress';
import { ES_CLIENT_HEADERS } from '../../client_headers';

const SCROLL_SIZE = 1000;
const SCROLL_TIMEOUT = '1m';

export function createGenerateDocRecordsStream({
  client,
  stats,
  progress,
  keepIndexNames,
  query,
}: {
  client: Client;
  stats: Stats;
  progress: Progress;
  keepIndexNames?: boolean;
  query?: Record<string, any>;
}) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        const interator = client.helpers.scrollSearch(
          {
            index,
            scroll: SCROLL_TIMEOUT,
            size: SCROLL_SIZE,
            _source: true,
            query,
            rest_total_hits_as_int: true,
          },
          {
            headers: ES_CLIENT_HEADERS,
          }
        );

        const hasDatastreams =
          (await client.indices.getDataStream({ name: index })).data_streams.length > 0;
        const indexToDatastream = new Map();

        let remainingHits: number | null = null;

        for await (const resp of interator) {
          if (remainingHits === null) {
            remainingHits = resp.body.hits.total as number;
            progress.addToTotal(remainingHits);
          }

          for (const hit of resp.body.hits.hits) {
            remainingHits -= 1;

            if (hasDatastreams && !indexToDatastream.has(hit._index)) {
              const {
                [hit._index]: { data_stream: dataStream },
              } = await client.indices.get({ index: hit._index, filter_path: ['*.data_stream'] });
              indexToDatastream.set(hit._index, dataStream);
            }

            const dataStream = indexToDatastream.get(hit._index);
            stats.archivedDoc(dataStream || hit._index);

            this.push({
              type: 'doc',
              value: {
                // if keepIndexNames is false, rewrite the .kibana_* index to .kibana_1 so that
                // when it is loaded it can skip migration, if possible
                index:
                  hit._index.startsWith(MAIN_SAVED_OBJECT_INDEX) && !keepIndexNames
                    ? `${MAIN_SAVED_OBJECT_INDEX}_1`
                    : hit._index,
                data_stream: dataStream,
                id: hit._id,
                source: hit._source,
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
