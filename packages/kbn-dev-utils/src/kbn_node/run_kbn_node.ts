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

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { getNodeBinDir } from './get_node_bin_dir';
import { getScriptName } from './get_script_name';

const args = process.argv.slice(2);
const stdio = [0, 1, 2];
const maxBuffer = 100 * 1024 * 1024;
const nodeDir = getNodeBinDir();
const scriptName = getScriptName();

if (existsSync(resolve(nodeDir, scriptName))) {
  execFileSync(`${resolve(nodeDir, scriptName)}`, args, { maxBuffer, stdio });
} else {
  throw new Error(
    `Kbn-node bin script is not installed. Please run 'yarn kbn bootstrap' or 'node scripts/register_kbn_node' and then retry.`
  );
}
