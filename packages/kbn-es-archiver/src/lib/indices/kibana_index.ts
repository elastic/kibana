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
import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { ES_CLIENT_HEADERS } from '../../client_headers';

/**
 * Deletes all indices that start with `.kibana`, or if onlyTaskManager==true, all indices that start with `.kibana_task_manager`
 */
export async function deleteKibanaIndices({
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
  const indexPattern = onlyTaskManager ? '.kibana_task_manager*' : '.kibana*';
  const indexNames = await fetchKibanaIndices(client, indexPattern);
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
export async function migrateKibanaIndex(kbnClient: KbnClient) {
  await kbnClient.savedObjects.migrate();
}

/**
 * Check if the given index is a Kibana saved object index.
 * This includes most .kibana_*
 * but we must make sure that indices such as '.kibana_security_session_1' are NOT deleted.
 *
 * IMPORTANT
 * After .kibana split, different SO types can go to different indices.
 * This method also takes into account legacy indices: .kibana_1 and .kibana_task_manager_1.
 * Thus, if any plugin registers a type using savedObjects.registerType() and binds it to a new
 * index, this code MUST be updated for the cleanKibanaIndices() to take them into account.
 * @param [index] the name of the index to check
 * @returns boolean 'true' if the index is a Kibana saved object index.
 */
function isKibanaIndex(index?: string): index is string {
  return Boolean(
    index &&
      (/^\.kibana(:?_\d*)?$/.test(index) ||
        /^\.kibana(_task_manager)?_(pre)?\d+\.\d+\.\d+/.test(index))
  );
}

async function fetchKibanaIndices(client: Client, indexPattern: string) {
  const resp = await client.cat.indices(
    { index: indexPattern, format: 'json' },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  if (!Array.isArray(resp)) {
    throw new Error(`expected response to be an array ${inspect(resp)}`);
  }

  return resp.map((x: { index?: string }) => x.index).filter(isKibanaIndex);
}

const delay = (delayInMs: number) => new Promise((resolve) => setTimeout(resolve, delayInMs));

export async function cleanKibanaIndices({
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
        index: `.kibana,.kibana_task_manager,.kibana_ui,.kibana_cases`,
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

  stats.deletedIndex('.kibana');
  stats.deletedIndex('.kibana_ui');
  stats.deletedIndex('.kibana_cases');
  stats.deletedIndex('.kibana_task_manager');
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
