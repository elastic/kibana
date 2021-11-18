/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';

export function createGenerateIndexRecordsStream({
  client,
  stats,
  keepIndexNames,
}: {
  client: KibanaClient;
  stats: Stats;
  keepIndexNames?: boolean;
}) {
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
              headers: ES_CLIENT_HEADERS,
            }
          )
        ).body as Record<string, any>;

        for (const [index, { settings, mappings }] of Object.entries(resp)) {
          const {
            body: {
              [index]: { aliases },
            },
          } = await client.indices.getAlias(
            { index },
            {
              headers: ES_CLIENT_HEADERS,
            }
          );

          stats.archivedIndex(index, { settings, mappings });
          this.push({
            type: 'index',
            value: {
              // if keepIndexNames is false, rewrite the .kibana_* index to .kibana_1 so that
              // when it is loaded it can skip migration, if possible
              index: index.startsWith('.kibana') && !keepIndexNames ? '.kibana_1' : index,
              settings,
              mappings,
              aliases,
            },
          });
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
