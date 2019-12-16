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

import { deleteIndex } from './delete_index';
import { collectUiExports } from '../../../legacy/ui/ui_exports';
import { KibanaMigrator } from '../../../core/server/saved_objects/migrations';
import { SavedObjectsSchema } from '../../../core/server/saved_objects';
import { findPluginSpecs } from '../../../legacy/plugin_discovery';

/**
 * Load the uiExports for a Kibana instance, only load uiExports from xpack if
 * it is enabled in the Kibana server.
 */
const getUiExports = async kibanaPluginIds => {
  const xpackEnabled = kibanaPluginIds.includes('xpack_main');

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
export async function migrateKibanaIndex({ client, log, kibanaPluginIds }) {
  const uiExports = await getUiExports(kibanaPluginIds);
  const kibanaVersion = await loadKibanaVersion();

  const config = {
    'xpack.task_manager.index': '.kibana_task_manager',
  };

  const migratorOptions = {
    config: { get: path => config[path] },
    savedObjectsConfig: {
      scrollDuration: '5m',
      batchSize: 100,
      pollInterval: 100,
    },
    kibanaConfig: {
      index: '.kibana',
    },
    logger: {
      trace: log.verbose.bind(log),
      debug: log.debug.bind(log),
      info: log.info.bind(log),
      warn: log.warning.bind(log),
      error: log.error.bind(log),
    },
    version: kibanaVersion,
    savedObjectSchemas: new SavedObjectsSchema(uiExports.savedObjectSchemas),
    savedObjectMappings: uiExports.savedObjectMappings,
    savedObjectMigrations: uiExports.savedObjectMigrations,
    savedObjectValidations: uiExports.savedObjectValidations,
    callCluster: (path, ...args) => _.get(client, path).call(client, ...args),
  };

  return await new KibanaMigrator(migratorOptions).runMigrations();
}

async function loadKibanaVersion() {
  const readFile = promisify(fs.readFile);
  const packageJson = await readFile(path.join(__dirname, '../../../../package.json'));
  return JSON.parse(packageJson).version;
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

export async function cleanKibanaIndices({ client, stats, log, kibanaPluginIds }) {
  if (!kibanaPluginIds.includes('spaces')) {
    return await deleteKibanaIndices({
      client,
      stats,
      log,
    });
  }

  while (true) {
    const resp = await client.deleteByQuery({
      index: `.kibana`,
      body: {
        query: {
          bool: {
            must_not: {
              ids: {
                type: '_doc',
                values: ['space:default'],
              },
            },
          },
        },
      },
      ignore: [409],
    });

    if (resp.total !== resp.deleted) {
      log.warning(
        'delete by query deleted %d of %d total documents, trying again',
        resp.deleted,
        resp.total
      );
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

export async function createDefaultSpace({ index, client }) {
  await client.create({
    index,
    type: '_doc',
    id: 'space:default',
    ignore: 409,
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
