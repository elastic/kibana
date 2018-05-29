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
import { Migration } from '@kbn/migrations';
import { KbnIndex } from '../../utils';
import { findPluginSpecs } from '../../plugin_discovery';

// This is an expensive operation, so we'll ensure it only happens once
const buildPlugins = _.once(async () => {
  const pluginSpecs = await findPluginSpecs({
    plugins: {
      scanDirs: [path.resolve(__dirname, '../../core_plugins')],
      paths: [path.resolve(__dirname, '../../../x-pack')],
    },
  });
  return KbnIndex.pluginSpecsToMigrations(await pluginSpecs.spec$.toArray().toPromise());
});

export async function migrateKibanaIndex({ client, log }) {
  const opts = {
    index: '.kibana',
    elasticVersion: await loadElasticVersion(),
    plugins: await buildPlugins(),
    callCluster: (path, ...args) => _.get(client, path).call(client, ...args),
    log: ([logType, messageType], ...args) => log[logType](`[${messageType}] ${args.join(' ')}`),
  };

  return await Migration.migrate(opts);
}

async function loadElasticVersion() {
  const readFile = promisify(fs.readFile);
  const packageJson = await readFile(path.join(__dirname, '../../../package.json'));
  return JSON.parse(packageJson).version;
}
