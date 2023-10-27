/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform, Readable } from 'stream';
import { inspect } from 'util';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  MAIN_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { Stats } from '../stats';
import {
  cleanSavedObjectIndices,
  deleteSavedObjectIndices,
  isSavedObjectIndex,
} from './kibana_index';
import { deleteIndex } from './delete_index';
import { deleteDataStream } from './delete_data_stream';
import { ES_CLIENT_HEADERS } from '../../client_headers';

interface DocRecord {
  value: estypes.IndicesIndexState & {
    index: string;
    type: string;
    template?: IndicesPutIndexTemplateRequest;
  };
}

export function createCreateIndexStream({
  client,
  stats,
  skipExisting = false,
  docsOnly = false,
  isArchiveInExceptionList = false,
  log,
}: {
  client: Client;
  stats: Stats;
  skipExisting?: boolean;
  docsOnly?: boolean;
  isArchiveInExceptionList?: boolean;
  log: ToolingLog;
}) {
  const skipDocsFromIndices = new Set();

  // If we're trying to import Kibana index docs, we need to ensure that
  // previous indices are removed so we're starting w/ a clean slate for
  // migrations. This only needs to be done once per archive load operation.
  let kibanaIndicesAlreadyDeleted = false;
  let kibanaTaskManagerIndexAlreadyDeleted = false;

  // if we detect saved object documents defined in the data.json, we will cleanup their indices
  let kibanaIndicesAlreadyCleaned = false;
  let kibanaTaskManagerIndexAlreadyCleaned = false;

  async function handleDoc(stream: Readable, record: DocRecord) {
    const index = record.value.index;

    if (skipDocsFromIndices.has(index)) {
      return;
    }

    if (!skipExisting) {
      if (index?.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX)) {
        if (!kibanaTaskManagerIndexAlreadyDeleted && !kibanaTaskManagerIndexAlreadyCleaned) {
          await cleanSavedObjectIndices({ client, stats, log, index });
          kibanaTaskManagerIndexAlreadyCleaned = true;
          log.debug(`Cleaned saved object index [${index}]`);
        }
      } else if (index?.startsWith(MAIN_SAVED_OBJECT_INDEX)) {
        if (!kibanaIndicesAlreadyDeleted && !kibanaIndicesAlreadyCleaned) {
          await cleanSavedObjectIndices({ client, stats, log });
          kibanaIndicesAlreadyCleaned = kibanaTaskManagerIndexAlreadyCleaned = true;
          log.debug(`Cleaned all saved object indices`);
        }
      }
    }

    stream.push(record);
  }

  async function handleDataStream(record: DocRecord, attempts = 1) {
    if (docsOnly) return;

    const { data_stream: dataStream, template } = record.value as {
      data_stream: string;
      template: IndicesPutIndexTemplateRequest;
    };

    try {
      await client.indices.putIndexTemplate(template, {
        headers: ES_CLIENT_HEADERS,
      });

      await client.indices.createDataStream(
        { name: dataStream },
        {
          headers: ES_CLIENT_HEADERS,
        }
      );
      stats.createdDataStream(dataStream, template.name, { template });
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception' || attempts >= 3) {
        throw err;
      }

      if (skipExisting) {
        skipDocsFromIndices.add(dataStream);
        stats.skippedIndex(dataStream);
        return;
      }

      await deleteDataStream(client, dataStream, template.name);
      stats.deletedDataStream(dataStream, template.name);
      await handleDataStream(record, attempts + 1);
    }
  }

  async function handleIndex(record: DocRecord) {
    const { index, settings, mappings, aliases } = record.value;
    const isKibanaTaskManager = index.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX);
    const isKibana = index.startsWith(MAIN_SAVED_OBJECT_INDEX) && !isKibanaTaskManager;

    if (docsOnly) {
      return;
    }

    if (isSavedObjectIndex(index) && !isArchiveInExceptionList) {
      throw new Error(
        `'esArchiver' no longer supports defining saved object indices, your archive is modifying '${index}'.
      The recommendation is to use 'kbnArchiver' to import saved objects in your tests.
      If you absolutely need to load some non-importable SOs, please stick to the official saved object indices created by Kibana at startup.
      You can achieve that by simply removing your saved object index definitions from 'mappings.json' (likely removing the file altogether).
      Find more information here: https://github.com/elastic/kibana/issues/161882`
      );
    }

    async function attemptToCreate(attemptNumber = 1) {
      try {
        if (isKibana && !kibanaIndicesAlreadyDeleted) {
          await deleteSavedObjectIndices({ client, stats, log }); // delete all .kibana* indices
          kibanaIndicesAlreadyDeleted = kibanaTaskManagerIndexAlreadyDeleted = true;
          log.debug(`Deleted all saved object indices`);
        } else if (isKibanaTaskManager && !kibanaTaskManagerIndexAlreadyDeleted) {
          await deleteSavedObjectIndices({ client, stats, onlyTaskManager: true, log }); // delete only .kibana_task_manager* indices
          kibanaTaskManagerIndexAlreadyDeleted = true;
          log.debug(`Deleted saved object index [${index}]`);
        }

        // create the index without the aliases
        await client.indices.create(
          {
            index,
            body: {
              settings,
              mappings,
            },
          },
          {
            headers: ES_CLIENT_HEADERS,
          }
        );

        // create the aliases on a separate step (see https://github.com/elastic/kibana/issues/158918)
        const actions: estypes.IndicesUpdateAliasesAction[] = Object.keys(aliases ?? {}).map(
          (alias) => ({
            add: {
              index,
              alias,
              ...aliases![alias],
            },
          })
        );

        if (actions.length) {
          await client.indices.updateAliases({ body: { actions } });
        }

        stats.createdIndex(index, { settings });
      } catch (err) {
        if (
          err?.body?.error?.reason?.includes('index exists with the same name as the alias') &&
          attemptNumber < 3
        ) {
          kibanaTaskManagerIndexAlreadyDeleted = false;
          if (isKibana) {
            kibanaIndicesAlreadyDeleted = false;
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

          case 'data_stream':
            await handleDataStream(record);
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
