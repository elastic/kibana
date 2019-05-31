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

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { toArray } from 'rxjs/operators';
import wreck from '@hapi/wreck';

import { deleteIndex } from './delete_index';
import { collectUiExports } from '../../../legacy/ui/ui_exports';
import { KibanaMigrator } from '../../../legacy/server/saved_objects/migrations';
import { findPluginSpecs } from '../../../legacy/plugin_discovery';

/**
 * Load the uiExports for a Kibana instance, only load uiExports from xpack if
 * it is enabled in the Kibana server.
 */
const getUiExports = async kibanaUrl => {
  const xpackEnabled = await getKibanaPluginEnabled({
    kibanaUrl,
    pluginId: 'xpack_main',
  });

  const { spec$ } = await findPluginSpecs({
    plugins: {
      scanDirs: [path.resolve(__dirname, '../../../legacy/core_plugins')],
      paths: xpackEnabled ? [path.resolve(__dirname, '../../../../x-pack')] : [],
    },
  });

  const specs = await spec$.pipe(toArray()).toPromise();
  return collectUiExports(specs);
};

/**
 * Deletes all indices that start with `.kibana`
 */
export async function deleteKibanaIndices({ client, stats, log }) {
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
export async function migrateKibanaIndex({ client, log, kibanaUrl }) {
  const uiExports = await getUiExports(kibanaUrl);
  const version = await loadElasticVersion();
  const config = {
    'kibana.index': '.kibana',
    'migrations.scrollDuration': '5m',
    'migrations.batchSize': 100,
    'migrations.pollInterval': 100,
  };
  const ready = async () => undefined;
  const elasticsearch = {
    getCluster: () => ({
      callWithInternalUser: (path, ...args) => _.get(client, path).call(client, ...args),
    }),
    waitUntilReady: ready,
  };

  const server = {
    log: ([logType, messageType], ...args) => log[logType](`[${messageType}] ${args.join(' ')}`),
    config: () => ({ get: path => config[path] }),
    plugins: { elasticsearch },
  };

  const kbnServer = {
    server,
    version,
    uiExports,
    ready,
  };

  return await new KibanaMigrator({ kbnServer }).awaitMigration();
}

async function loadElasticVersion() {
  const readFile = promisify(fs.readFile);
  const packageJson = await readFile(path.join(__dirname, '../../../../package.json'));
  return JSON.parse(packageJson).version;
}

export async function isSpacesEnabled({ kibanaUrl }) {
  return await getKibanaPluginEnabled({
    kibanaUrl,
    pluginId: 'spaces',
  });
}

async function getKibanaPluginEnabled({ pluginId, kibanaUrl }) {
  try {
    const { payload } = await wreck.get('/api/status', {
      baseUrl: kibanaUrl,
      json: true,
    });

    return payload.status.statuses.some(({ id }) => id.includes(`plugin:${pluginId}@`));
  } catch (error) {
    throw new Error(
      `Unable to fetch Kibana status API response from Kibana at ${kibanaUrl}: ${error}`
    );
  }
}

export async function createDefaultSpace({ index, client }) {
  await client.index({
    index,
    type: '_doc',
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
  });
}

/**
 * Migrations mean that the Kibana index will look something like:
 * .kibana, .kibana_1, .kibana_323, etc. This finds all indices starting
 * with .kibana, then filters out any that aren't actually Kibana's core
 * index (e.g. we don't want to remove .kibana_task_manager or the like).
 *
 * @param {string} index
 */
async function fetchKibanaIndices(client) {
  const kibanaIndices = await client.cat.indices({ index: '.kibana*', format: 'json' });
  const isKibanaIndex = index => /^\.kibana(:?_\d*)?$/.test(index);
  return kibanaIndices.map(x => x.index).filter(isKibanaIndex);
}

export async function cleanKibanaIndices({ client, stats, log, kibanaUrl }) {
  if (!(await isSpacesEnabled({ kibanaUrl }))) {
    return await deleteKibanaIndices({
      client,
      stats,
      log,
    });
  }

  await client.deleteByQuery({
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
  });

  log.warning(
    `since spaces are enabled, all objects other than the default space were deleted from ` +
      `.kibana rather than deleting the whole index`
  );

  stats.deletedIndex('.kibana');
}
