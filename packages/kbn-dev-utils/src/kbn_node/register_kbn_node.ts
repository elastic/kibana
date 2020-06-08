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

import { chmod, writeFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import { run } from '../run';
import { getNodeBinDir } from './get_node_bin_dir';
import { getScriptName } from './get_script_name';
import { getScriptSource } from './get_script_source';

const chmodAsync = promisify(chmod);
const writeFileAsync = promisify(writeFile);

run(
  async ({ log }) => {
    try {
      const nodeDir = getNodeBinDir();
      const scriptName = getScriptName();
      const scriptSource = getScriptSource();
      const installPath = resolve(nodeDir, scriptName);

      log.info(`Registering kbn-node bin scripts...`);
      await writeFileAsync(installPath, scriptSource);
      await chmodAsync(installPath, 0o755);
      log.success(`Kbn-node bin script was installed successfully.`);
    } catch (e) {
      log.error(`Kbn-node bin script was not installed as an error occur.`);
      throw e;
    }
  },
  {
    description: 'Register kbn-node bin script',
  }
);
