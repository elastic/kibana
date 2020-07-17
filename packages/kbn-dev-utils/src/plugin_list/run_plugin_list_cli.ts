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

import Path from 'path';
import Fs from 'fs';

import { run } from '../run';
import { REPO_ROOT } from '../repo_root';

import { discoverPlugins } from './discover_plugins';
import { generatePluginList } from './generate_plugin_list';

const OSS_PLUGIN_DIR = Path.resolve(REPO_ROOT, 'src/plugins');
const XPACK_PLUGIN_DIR = Path.resolve(REPO_ROOT, 'x-pack/plugins');
const OUTPUT_PATH = Path.resolve(
  REPO_ROOT,
  'docs/developer/architecture/code-exploration.asciidoc'
);

export function runPluginListCli() {
  run(async ({ log }) => {
    log.info('looking for oss plugins');
    const ossPlugins = discoverPlugins(OSS_PLUGIN_DIR);
    log.success(`found ${ossPlugins.length} plugins`);

    log.info('looking for x-pack plugins');
    const xpackPlugins = discoverPlugins(XPACK_PLUGIN_DIR);
    log.success(`found ${xpackPlugins.length} plugins`);

    log.info('writing plugin list to', OUTPUT_PATH);
    Fs.writeFileSync(OUTPUT_PATH, generatePluginList(ossPlugins, xpackPlugins));
  });
}
