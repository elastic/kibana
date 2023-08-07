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
import { cleanSavedObjectIndices, deleteSavedObjectIndices } from './kibana_index';
import { deleteIndex } from './delete_index';
import { ES_CLIENT_HEADERS } from '../../client_headers';
import { MAIN_SAVED_OBJECT_INDEX, TASK_MANAGER_SAVED_OBJECT_INDEX } from './constants';

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
  docsOnly = false,
  log,
}: {
  client: KibanaClient;
  stats: Stats;
  skipExisting?: boolean;
  docsOnly?: boolean;
  log: ToolingLog;
}) {
  const skipDocsFromIndices = new Set();

  // If we're trying to import Kibana index docs, we need to ensure that
  // previous indices are removed so we're starting w/ a clean slate for
  // migrations. This only needs to be done once per archive load operation.
  let savedObjectIndicesAlreadyDeleted = false;
  let taskManagerIndexAlreadyDeleted = false;

  // if we detect saved object documents defined in the data.json, we will cleanup their indices
  let savedObjectIndicesAlreadyCleaned = false;
  let taskManagerIndexAlreadyCleaned = false;

  async function handleDoc(stream: Readable, record: DocRecord) {
    const index = record.value.index;

    if (skipDocsFromIndices.has(index)) {
      return;
    }

    if (!skipExisting) {
      if (index?.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX)) {
        if (!taskManagerIndexAlreadyDeleted && !taskManagerIndexAlreadyCleaned) {
          await cleanSavedObjectIndices({ client, stats, log, index });
          taskManagerIndexAlreadyCleaned = true;
          log.debug(`Cleaned saved object index [${index}]`);
        }
      } else if (index?.startsWith(MAIN_SAVED_OBJECT_INDEX)) {
        if (!savedObjectIndicesAlreadyDeleted && !savedObjectIndicesAlreadyCleaned) {
          await cleanSavedObjectIndices({ client, stats, log });
          savedObjectIndicesAlreadyCleaned = taskManagerIndexAlreadyCleaned = true;
          log.debug(`Cleaned all saved object indices`);
        }
      }
    }

    stream.push(record);
  }

  async function handleIndex(record: DocRecord) {
    const { index, settings, mappings, aliases } = record.value;
    const isKibanaTaskManager = index.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX);
    const isKibana = index.startsWith(MAIN_SAVED_OBJECT_INDEX) && !isKibanaTaskManager;

    if (docsOnly) {
      return;
    }

    async function attemptToCreate(attemptNumber = 1) {
      try {
        if (isKibana && !savedObjectIndicesAlreadyDeleted) {
          await deleteSavedObjectIndices({ client, stats, log }); // delete all .kibana* indices
          savedObjectIndicesAlreadyDeleted = taskManagerIndexAlreadyDeleted = true;
          log.debug(`Deleted all saved object indices`);
        } else if (isKibanaTaskManager && !taskManagerIndexAlreadyDeleted) {
          await deleteSavedObjectIndices({ client, stats, onlyTaskManager: true, log }); // delete only .kibana_task_manager* indices
          taskManagerIndexAlreadyDeleted = true;
          log.debug(`Deleted saved object index [${index}]`);
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
          taskManagerIndexAlreadyDeleted = false;
          if (isKibana) {
            savedObjectIndicesAlreadyDeleted = false;
          }

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
