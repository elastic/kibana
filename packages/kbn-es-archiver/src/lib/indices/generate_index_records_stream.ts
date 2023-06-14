/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { Transform } from 'stream';
import { ToolingLog } from '@kbn/tooling-log';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';
import { getIndexTemplate } from '..';

const headers = {
  headers: ES_CLIENT_HEADERS,
};

export function createGenerateIndexRecordsStream({
  client,
  stats,
  keepIndexNames,
  log,
}: {
  client: Client;
  stats: Stats;
  keepIndexNames?: boolean;
  log: ToolingLog;
}) {
  const seenDatastreams = new Set();

  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(indexOrAlias, enc, callback) {
      try {
        const resp = (
          await client.indices.get(
            {
              index: indexOrAlias,
              filter_path: [
                '*.settings',
                '*.mappings',
                '*.data_stream',
                // remove settings that aren't really settings
                '-*.settings.index.creation_date',
                '-*.settings.index.uuid',
                '-*.settings.index.version',
                '-*.settings.index.provided_name',
                '-*.settings.index.frozen',
                '-*.settings.index.search.throttled',
                '-*.settings.index.query',
                '-*.settings.index.routing',
              ],
            },
            {
              ...headers,
              meta: true,
            }
          )
        ).body;

        for (const [index, { data_stream: dataStream, settings, mappings }] of Object.entries(
          resp
        )) {
          if (dataStream) {
            log.info(`${index} will be saved as data_stream ${dataStream}`);

            if (seenDatastreams.has(dataStream)) {
              log.info(`${dataStream} is already archived`);
              continue;
            }

            const { data_streams: dataStreams } = await client.indices.getDataStream(
              { name: dataStream },
              headers
            );
            const template = await getIndexTemplate(client, dataStreams[0].template);

            seenDatastreams.add(dataStream);
            stats.archivedIndex(dataStream, { template });
            this.push({
              type: 'data_stream',
              value: {
                data_stream: dataStream,
                template,
              },
            });
          } else {
            const {
              body: {
                [index]: { aliases },
              },
            } = await client.indices.getAlias({ index }, { ...headers, meta: true });

            stats.archivedIndex(index, { settings, mappings });
            this.push({
              type: 'index',
              value: {
                // if keepIndexNames is false, rewrite the .kibana_* index to .kibana_1 so that
                // when it is loaded it can skip migration, if possible
                index:
                  index.startsWith(MAIN_SAVED_OBJECT_INDEX) && !keepIndexNames
                    ? `${MAIN_SAVED_OBJECT_INDEX}_1`
                    : index,
                settings,
                mappings,
                aliases,
              },
            });
          }
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
