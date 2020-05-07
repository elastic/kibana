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

import loadJsonFile from 'load-json-file';

const isKibanaDir = (dir: string) => {
  try {
    const path = Path.resolve(dir, 'package.json');
    const json = loadJsonFile.sync(path);
    if (json && typeof json === 'object' && 'name' in json && json.name === 'kibana') {
      return true;
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

// search for the kibana directory, since this file is moved around it might
// not be where we think but should always be a relatively close parent
// of this directory
const startDir = Fs.realpathSync(__dirname);
const { root: rootDir } = Path.parse(startDir);
let cursor = startDir;
while (true) {
  if (isKibanaDir(cursor)) {
    break;
  }

  const parent = Path.dirname(cursor);
  if (parent === rootDir) {
    throw new Error(`unable to find kibana directory from ${startDir}`);
  }
  cursor = parent;
}

export const REPO_ROOT = cursor;
