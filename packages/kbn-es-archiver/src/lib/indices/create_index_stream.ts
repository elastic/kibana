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

import { Transform, Readable } from 'stream';
import { inspect } from 'util';

import { get, once } from 'lodash';
import { Client } from 'elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';

import { Stats } from '../stats';
import { deleteKibanaIndices } from './kibana_index';
import { deleteIndex } from './delete_index';

interface DocRecord {
  value: {
    index: string;
    type: string;
    settings: Record<string, any>;
    mappings: Record<string, any>;
    aliases: Record<string, any>;
  };
}

export function createCreateIndexStream({
  client,
  stats,
  skipExisting = false,
  log,
}: {
  client: Client;
  stats: Stats;
  skipExisting?: boolean;
  log: ToolingLog;
}) {
  const skipDocsFromIndices = new Set();

  // If we're trying to import Kibana index docs, we need to ensure that
  // previous indices are removed so we're starting w/ a clean slate for
  // migrations. This only needs to be done once per archive load operation.
  const deleteKibanaIndicesOnce = once(deleteKibanaIndices);

  async function handleDoc(stream: Readable, record: DocRecord) {
    if (skipDocsFromIndices.has(record.value.index)) {
      return;
    }

    stream.push(record);
  }

  async function handleIndex(record: DocRecord) {
    const { index, settings, mappings, aliases } = record.value;
    const isKibana = index.startsWith('.kibana');

    async function attemptToCreate(attemptNumber = 1) {
      try {
        if (isKibana) {
          await deleteKibanaIndicesOnce({ client, stats, log });
        }

        await client.indices.create({
          method: 'PUT',
          index,
          body: {
            settings,
            mappings,
            aliases,
          },
        });

        stats.createdIndex(index, { settings });
      } catch (err) {
        if (
          err?.body?.error?.reason?.includes('index exists with the same name as the alias') &&
          attemptNumber < 3
        ) {
          const aliasStr = inspect(aliases);
          log.info(
            `failed to create aliases [${aliasStr}] because ES indicated an index/alias already exists, trying again`
          );
          await attemptToCreate(attemptNumber + 1);
          return;
        }

        if (
          get(err, 'body.error.type') !== 'resource_already_exists_exception' ||
          attemptNumber >= 3
        ) {
          throw err;
        }

        if (skipExisting) {
          skipDocsFromIndices.add(index);
          stats.skippedIndex(index);
          return;
        }

        await deleteIndex({ client, stats, index, log });
        await attemptToCreate(attemptNumber + 1);
        return;
      }
    }

    await attemptToCreate();
  }

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        switch (record && record.type) {
          case 'index':
            await handleIndex(record);
            break;

          case 'doc':
            await handleDoc(this, record);
            break;

          default:
            this.push(record);
            break;
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
