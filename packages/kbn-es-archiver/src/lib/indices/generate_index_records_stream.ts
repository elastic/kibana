/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';
import { Client } from 'elasticsearch';
import { Stats } from '../stats';

export function createGenerateIndexRecordsStream(client: Client, stats: Stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(indexOrAlias, enc, callback) {
      try {
        const resp = (await client.indices.get({
          index: indexOrAlias,
          filterPath: [
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
        })) as Record<string, any>;

        for (const [index, { settings, mappings }] of Object.entries(resp)) {
          const {
            [index]: { aliases },
          } = await client.indices.getAlias({ index });

          stats.archivedIndex(index, { settings, mappings });
          this.push({
            type: 'index',
            value: {
              // always rewrite the .kibana_* index to .kibana_1 so that
              // when it is loaded it can skip migration, if possible
              index: index.startsWith('.kibana') ? '.kibana_1' : index,
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
