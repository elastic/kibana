/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform, Readable } from 'stream';
import { inspect } from 'util';

import { estypes } from '@elastic/elasticsearch';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog } from '@kbn/dev-utils';

import { Stats } from '../stats';
import { deleteKibanaIndices } from './kibana_index';
import { deleteIndex } from './delete_index';
import { ES_CLIENT_HEADERS } from '../../client_headers';

interface DocRecord {
  value: estypes.IndicesIndexState & {
    index: string;
    type: string;
  };
}

export function createCreateIndexStream({
  client,
  stats,
  skipExisting = false,
  log,
}: {
  client: KibanaClient;
  stats: Stats;
  skipExisting?: boolean;
  log: ToolingLog;
}) {
  const skipDocsFromIndices = new Set();

  // If we're trying to import Kibana index docs, we need to ensure that
  // previous indices are removed so we're starting w/ a clean slate for
  // migrations. This only needs to be done once per archive load operation.
  let kibanaIndexAlreadyDeleted = false;

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
        if (isKibana && !kibanaIndexAlreadyDeleted) {
          await deleteKibanaIndices({ client, stats, log });
          kibanaIndexAlreadyDeleted = true;
        }

        await client.indices.create(
          {
            index,
            body: {
              settings,
              mappings,
              aliases,
            },
          },
          {
            headers: ES_CLIENT_HEADERS,
          }
        );

        stats.createdIndex(index, { settings });
      } catch (err) {
        if (
          err?.body?.error?.reason?.includes('index exists with the same name as the alias') &&
          attemptNumber < 3
        ) {
          kibanaIndexAlreadyDeleted = false;
          const aliasStr = inspect(aliases);
          log.info(
            `failed to create aliases [${aliasStr}] because ES indicated an index/alias already exists, trying again`
          );
          await attemptToCreate(attemptNumber + 1);
          return;
        }

        if (
          err?.meta?.body?.error?.type !== 'resource_already_exists_exception' ||
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
