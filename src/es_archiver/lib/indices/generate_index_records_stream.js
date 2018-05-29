/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Transform } from 'stream';

export function createGenerateIndexRecordsStream(client, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        const resp = await client.indices.get({
          index,
          filterPath: [
            '*.settings',
            '*.mappings',
            // remove settings that aren't really settings
            '-*.settings.index.creation_date',
            '-*.settings.index.uuid',
            '-*.settings.index.version',
            '-*.settings.index.provided_name',
          ]
        });

        const { [index]: { aliases } } = await client.indices.getAlias({ index });
        const { settings, mappings } = resp[index];

        stats.archivedIndex(index, { settings, mappings });
        callback(null, {
          type: 'index',
          value: {
            index,
            settings,
            mappings,
            aliases,
          }
        });
      } catch (err) {
        callback(err);
      }
    }
  });
}
