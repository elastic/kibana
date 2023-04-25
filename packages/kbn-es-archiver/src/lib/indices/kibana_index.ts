/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import {
  MAIN_SAVED_OBJECT_INDEX,
  ALL_SAVED_OBJECT_INDICES,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { ES_CLIENT_HEADERS } from '../../client_headers';

/**
 * Deletes all saved object indices, or if onlyTaskManager==true, it deletes task_manager indices
 */
export async function deleteSavedObjectIndices({
  client,
  stats,
  onlyTaskManager = false,
  log,
}: {
  client: Client;
  stats: Stats;
  onlyTaskManager?: boolean;
  log: ToolingLog;
}) {
  const indexNames = (await fetchSavedObjectIndices(client)).filter(
    (indexName) => !onlyTaskManager || indexName.includes(TASK_MANAGER_SAVED_OBJECT_INDEX)
  );
  if (!indexNames.length) {
    return;
  }

  await client.indices.putSettings(
    {
      index: indexNames,
      body: { blocks: { read_only: false } },
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  await deleteIndex({
    client,
    stats,
    index: indexNames,
    log,
  });

  return indexNames;
}

/**
 * Given an elasticsearch client, and a logger, migrates the `.kibana` index. This
 * builds up an object that implements just enough of the kbnMigrations interface
 * as is required by migrations.
 */
export async function migrateSavedObjectIndices(kbnClient: KbnClient) {
  await kbnClient.savedObjects.migrate();
}

/**
 * Check if the given index is a Kibana saved object index.
 * This includes most .kibana_*
 * but we must make sure that indices such as '.kibana_security_session_1' are NOT deleted.
 *
 * IMPORTANT
 * Note that we can have more than 2 system indices (different SO types can go to different indices)
 * ATM we have '.kibana', '.kibana_task_manager', '.kibana_cases'
 * This method also takes into account legacy indices: .kibana_1, .kibana_task_manager_1.
 * @param [index] the name of the index to check
 * @returns boolean 'true' if the index is a Kibana saved object index.
 */

const LEGACY_INDICES_REGEXP = new RegExp(`^(${ALL_SAVED_OBJECT_INDICES.join('|')})(:?_\\d*)?$`);
const INDICES_REGEXP = new RegExp(`^(${ALL_SAVED_OBJECT_INDICES.join('|')})_(pre)?\\d+.\\d+.\\d+`);

function isSavedObjectIndex(index?: string): index is string {
  return Boolean(index && (LEGACY_INDICES_REGEXP.test(index) || INDICES_REGEXP.test(index)));
}

async function fetchSavedObjectIndices(client: Client) {
  const resp = await client.cat.indices(
    { index: `${MAIN_SAVED_OBJECT_INDEX}*`, format: 'json' },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  if (!Array.isArray(resp)) {
    throw new Error(`expected response to be an array ${inspect(resp)}`);
  }

  return resp.map((x: { index?: string }) => x.index).filter(isSavedObjectIndex);
}

const delay = (delayInMs: number) => new Promise((resolve) => setTimeout(resolve, delayInMs));

export async function cleanSavedObjectIndices({
  client,
  stats,
  log,
}: {
  client: Client;
  stats: Stats;
  log: ToolingLog;
}) {
  while (true) {
    const resp = await client.deleteByQuery(
      {
        index: ALL_SAVED_OBJECT_INDICES,
        body: {
          query: {
            bool: {
              must_not: {
                ids: {
                  values: ['space:default'],
                },
              },
            },
          },
        },
      },
      {
        ignore: [404, 409],
        headers: ES_CLIENT_HEADERS,
      }
    );

    if (resp.total !== resp.deleted) {
      log.warning(
        'delete by query deleted %d of %d total documents, trying again',
        resp.deleted,
        resp.total
      );
      await delay(200);
      continue;
    }

    break;
  }

  log.warning(
    `since spaces are enabled, all objects other than the default space were deleted from ` +
      `.kibana rather than deleting the whole index`
  );

  ALL_SAVED_OBJECT_INDICES.forEach((indexPattern) => stats.deletedIndex(indexPattern));
}

export async function createDefaultSpace({ index, client }: { index: string; client: Client }) {
  await client.create(
    {
      index,
      id: 'space:default',
      refresh: 'wait_for',
      body: {
        type: 'space',
        updated_at: new Date().toISOString(),
        space: {
          name: 'Default Space',
          description: 'This is the default space',
          disabledFeatures: [],
          _reserved: true,
        },
      },
    },
    {
      ignore: [409],
      headers: ES_CLIENT_HEADERS,
    }
  );
}
