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

import fs from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { flatten } from 'lodash';
import { pathsRegistry } from '../common/lib/paths_registry';

const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

const isDirectory = path =>
  lstat(path)
    .then(stat => stat.isDirectory())
    .catch(() => false);

export const getPluginPaths = type => {
  const typePaths = pathsRegistry.get(type);
  if (!typePaths) {
    throw new Error(`Unknown type: ${type}`);
  }

  return Promise.all(typePaths.map(async path => {
    const isDir = await isDirectory(path);
    if (!isDir) {
      return;
    }
    // Get the full path of all js files in the directory
    return readdir(path).then(files => {
      return files.reduce((acc, file) => {
        if (file.endsWith('.js')) {
          acc.push(resolve(path, file));
        }
        return acc;
      }, []);
    }).catch();
  })).then(flatten);
};
