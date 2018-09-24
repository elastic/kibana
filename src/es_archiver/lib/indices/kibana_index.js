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
import { collectUiExports } from '../../../ui/ui_exports';
import { KibanaMigrator } from '../../../server/saved_objects/migrations';
import { findPluginSpecs } from '../../../plugin_discovery';

/**
 * This is an expensive operation, so we'll ensure it only happens once
 */
const buildUiExports = _.once(async () => {
  const { spec$ } = await findPluginSpecs({
    plugins: {
      scanDirs: [path.resolve(__dirname, '../../../core_plugins')],
      paths: [path.resolve(__dirname, '../../../../x-pack')],
    },
  });

  const specs = await spec$.pipe(toArray()).toPromise();
  return collectUiExports(specs);
});

/**
 * Deletes all indices that start with `.kibana`
 */
export async function deleteKibanaIndices({ client, stats }) {
  const kibanaIndices = await client.cat.indices({ index: '.kibana*', format: 'json' });
  const indexNames = kibanaIndices.map(x => x.index);
  if (!indexNames.length) {
    return;
  }
  await client.indices.putSettings({
    index: indexNames,
    body: { index: { blocks: { read_only: false } } },
  });
  await client.indices.delete({ index: indexNames });
  indexNames.forEach(stats.deletedIndex);
  return indexNames;
}

/**
 * Given an elasticsearch client, and a logger, migrates the `.kibana` index. This
 * builds up an object that implements just enough of the kbnMigrations interface
 * as is required by migrations.
 */
export async function migrateKibanaIndex({ client, log }) {
  const uiExports = await buildUiExports();
  const version = await loadElasticVersion();
  const config = {
    'kibana.index': '.kibana',
    'migrations.scrollDuration': '5m',
    'migrations.batchSize': 100,
    'migrations.pollInterval': 100,
  };
  const elasticsearch = {
    getCluster: () => ({
      callWithInternalUser: (path, ...args) => _.get(client, path).call(client, ...args),
    }),
    waitUntilReady: () => Promise.resolve(),
  };

  const server = {
    log: ([logType, messageType], ...args) => log[logType](`[${messageType}] ${args.join(' ')}`),
    config: () => ({ get: (path) => config[path] }),
    plugins: { elasticsearch },
  };

  const kbnServer = {
    server,
    version,
    uiExports,
  };

  return await new KibanaMigrator({ kbnServer }).migrateIndex();
}

async function loadElasticVersion() {
  const readFile = promisify(fs.readFile);
  const packageJson = await readFile(path.join(__dirname, '../../../../package.json'));
  return JSON.parse(packageJson).version;
}
