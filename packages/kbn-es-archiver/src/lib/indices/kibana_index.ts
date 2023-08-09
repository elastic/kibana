/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import type { estypes } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { ES_CLIENT_HEADERS } from '../../client_headers';
import {
  ALL_SAVED_OBJECT_INDICES,
  MAIN_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
} from './constants';

/**
 * Deletes all indices that start with `.kibana`, or if onlyTaskManager==true, all indices that start with `.kibana_task_manager`
 */
export async function deleteSavedObjectIndices({
  client,
  stats,
  onlyTaskManager = false,
  log,
}: {
  client: KibanaClient;
  stats: Stats;
  onlyTaskManager?: boolean;
  log: ToolingLog;
}) {
  const indexPattern = onlyTaskManager
    ? `${TASK_MANAGER_SAVED_OBJECT_INDEX}*`
    : `${MAIN_SAVED_OBJECT_INDEX}*`;
  const indexNames = await fetchSavedObjectIndices(client, indexPattern);
  if (!indexNames.length) {
    return;
  }

  await client.indices.putSettings(
    {
      index: indexNames,
      body: { settings: { blocks: { read_only: false } } },
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
export async function migrateSavedObjectIndex({ kbnClient }: { kbnClient: KbnClient }) {
  await kbnClient.savedObjects.migrate();
}

/**
 * Migrations mean that the Kibana index will look something like:
 * .kibana, .kibana_1, .kibana_323, etc. This finds all indices starting
 * with .kibana, then filters out any that aren't actually Kibana's core
 * index (e.g. we don't want to remove .kibana_task_manager or the like).
 */
function isSavedObjectIndex(index?: string): index is string {
  return Boolean(
    index &&
      (/^\.kibana(:?_\d*)?$/.test(index) ||
        /^\.kibana(_task_manager)?_(pre)?\d+\.\d+\.\d+/.test(index))
  );
}

async function fetchSavedObjectIndices(client: KibanaClient, indexPattern: string) {
  const resp = await client.cat.indices(
    { index: indexPattern, format: 'json' },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  if (!Array.isArray(resp.body)) {
    throw new Error(`expected response to be an array ${inspect(resp.body)}`);
  }

  return resp.body.map((x: { index?: string }) => x.index).filter(isSavedObjectIndex);
}

const delay = (delayInMs: number) => new Promise((resolve) => setTimeout(resolve, delayInMs));

export async function cleanSavedObjectIndices({
  client,
  stats,
  log,
  index = ALL_SAVED_OBJECT_INDICES,
}: {
  client: KibanaClient;
  stats: Stats;
  log: ToolingLog;
  index?: string | string[];
}) {
  while (true) {
    const resp = await client.deleteByQuery(
      {
        index,
        body: {
          query: {
            bool: {
              must_not: {
                ids: {
                  values: ['space:default'],
                },
              },
            },
          } as estypes.QueryDslQueryContainer,
        },
      },
      {
        ignore: [404, 409],
        headers: ES_CLIENT_HEADERS,
      }
    );

    if (resp.body.total !== resp.body.deleted) {
      log.warning(
        'delete by query deleted %d of %d total documents, trying again',
        resp.body.deleted,
        resp.body.total
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

  stats.deletedIndex(MAIN_SAVED_OBJECT_INDEX);
  stats.deletedIndex(TASK_MANAGER_SAVED_OBJECT_INDEX);
}

export async function createDefaultSpace({
  index,
  client,
}: {
  index: string;
  client: KibanaClient;
}) {
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
