/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { Client } from '@elastic/elasticsearch';
import { ToolingLog, KbnClient } from '@kbn/dev-utils';
import { Stats } from '../stats';
import { deleteIndex } from './delete_index';

/**
 * Deletes all indices that start with `.kibana`
 */
export async function deleteKibanaIndices({
  client,
  stats,
  log,
}: {
  client: Client;
  stats: Stats;
  log: ToolingLog;
}) {
  const indexNames = await fetchKibanaIndices(client);
  if (!indexNames.length) {
    return;
  }

  await client.indices.putSettings({
    index: indexNames,
    body: { index: { blocks: { read_only: false } } },
  });

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
export async function migrateKibanaIndex({
  client,
  kbnClient,
}: {
  client: Client;
  kbnClient: KbnClient;
}) {
  // we allow dynamic mappings on the index, as some interceptors are accessing documents before
  // the migration is actually performed. The migrator will put the value back to `strict` after migration.
  await client.indices.putMapping(
    {
      index: '.kibana',
      body: {
        dynamic: true,
      },
    },
    {
      ignore: [404],
    }
  );

  await kbnClient.savedObjects.migrate();
}

/**
 * Migrations mean that the Kibana index will look something like:
 * .kibana, .kibana_1, .kibana_323, etc. This finds all indices starting
 * with .kibana, then filters out any that aren't actually Kibana's core
 * index (e.g. we don't want to remove .kibana_task_manager or the like).
 */
async function fetchKibanaIndices(client: Client) {
  const resp = await client.cat.indices<unknown>({ index: '.kibana*', format: 'json' });
  const isKibanaIndex = (index: string) => /^\.kibana(:?_\d*)?$/.test(index);

  if (!Array.isArray(resp.body)) {
    throw new Error(`expected response to be an array ${inspect(resp.body)}`);
  }

  return resp.body.map((x: { index: string }) => x.index).filter(isKibanaIndex);
}

const delay = (delayInMs: number) => new Promise((resolve) => setTimeout(resolve, delayInMs));

export async function cleanKibanaIndices({
  client,
  stats,
  log,
  kibanaPluginIds,
}: {
  client: Client;
  stats: Stats;
  log: ToolingLog;
  kibanaPluginIds: string[];
}) {
  if (!kibanaPluginIds.includes('spaces')) {
    return await deleteKibanaIndices({
      client,
      stats,
      log,
    });
  }

  while (true) {
    const resp = await client.deleteByQuery(
      {
        index: `.kibana`,
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
        ignore: [409],
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

  stats.deletedIndex('.kibana');
}

export async function createDefaultSpace({ index, client }: { index: string; client: Client }) {
  await client.create(
    {
      index,
      id: 'space:default',
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
    }
  );
}
