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

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { flatten } from 'lodash';
import { pluginPaths } from './plugin_paths';

const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

const isDirectory = path =>
  lstat(path)
    .then(stat => stat.isDirectory())
    .catch(() => false); // if lstat fails, it doesn't exist and is not a directory

const filterDirectories = (paths, { exclude = false } = {}) => {
  return Promise.all(paths.map(p => isDirectory(p))).then(directories => {
    return paths.filter((p, i) => (exclude ? !directories[i] : directories[i]));
  });
};


export const getPluginPaths = (pathsRegistry, type) => {
  const typePath = pluginPaths[type];
  if (!typePath) throw new Error(`Unknown type: ${type}`);
  const paths = pathsRegistry.get(type);

  async function findPlugins(directory) {
    const isDir = await isDirectory(directory);
    if (!isDir) return;

    return path.resolve(directory, ...typePath);
  }

  return Promise.all(paths.map(findPlugins))
    .then(dirs => dirs.reduce((list, dir) => {
      if (!dir) return list;
      return list.concat(dir);
    }, []))
    .then(possibleCanvasPlugins => filterDirectories(possibleCanvasPlugins, { exclude: false }))
    .then(canvasPluginDirectories => {
      return Promise.all(
        canvasPluginDirectories.map(dir =>
          // Get the full path of all files in the directory
          readdir(dir).then(files => files.map(file => path.resolve(dir, file)))
        )
      )
        .then(flatten)
        .then(files => filterDirectories(files, { exclude: true }));
    });
};
