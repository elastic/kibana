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
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';

const headers = {
  headers: ES_CLIENT_HEADERS,
};

const getDsIndexTemplate = async (client: Client, data_stream: string) => {
  const { data_streams } = await client.indices.getDataStream({ name: data_stream }, headers);
  const templateName = data_streams[0].template;
  const { index_templates } = await client.indices.getIndexTemplate(
    { name: templateName },
    headers
  );
  const {
    index_template: { index_patterns, template },
  } = index_templates[0];

  return {
    name: templateName,
    index_patterns,
    template,
    data_stream: {},
  };
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

        const seenDatastreams = new Set();

        for (const [index, { data_stream, settings, mappings }] of Object.entries(resp)) {
          if (data_stream) {
            log.info(`${index} will be saved as data_stream ${data_stream}`);

            if (seenDatastreams.has(data_stream)) {
              log.info(`${data_stream} is already archived`);
              continue;
            }

            const template = await getDsIndexTemplate(client, data_stream);

            seenDatastreams.add(data_stream);
            stats.archivedIndex(data_stream, { template });
            this.push({
              type: 'data_stream',
              value: {
                data_stream,
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
                index: index.startsWith('.kibana') && !keepIndexNames ? '.kibana_1' : index,
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
