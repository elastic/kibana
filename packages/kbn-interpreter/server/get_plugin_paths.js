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

const canvasPluginDirectoryName = 'canvas_plugin';

// These must all exist
const paths = [
  path.resolve(__dirname, '..', '..', '..'), // Canvas core plugins
  path.resolve(__dirname, '..', '..', '..', '..', '..', 'plugins'), // Kibana plugin directory
];

export const getPluginPaths = type => {
  const typePath = pluginPaths[type];
  if (!typePath) throw new Error(`Unknown type: ${type}`);

  function findPlugins(directory) {
    return readdir(directory) // Get names of everything in the directory
      .then(names => names.filter(name => name[0] !== '.')) // Filter out names that start with .
      .then(names => {
        // Create paths to stuff that might have a canvas plugin of the provided type
        return names.map(name =>
          path.resolve(directory, name, canvasPluginDirectoryName, ...typePath)
        );
      });
  }

  return Promise.all(paths.map(findPlugins))
    .then(lists => [].concat(...lists))
    .then(possibleCanvasPlugins => {
      // Check how many are directories. If lstat fails it doesn't exist anyway.
      return Promise.all(
        // An array
        possibleCanvasPlugins.map(
          pluginPath =>
            lstat(pluginPath)
              .then(stat => stat.isDirectory()) // Exists and is a directory
              .catch(() => false) // I guess it doesn't exist, so whaevs
        )
      ).then(isDirectory => possibleCanvasPlugins.filter((pluginPath, i) => isDirectory[i]));
    })
    .then(canvasPluginDirectories => {
      return Promise.all(
        canvasPluginDirectories.map(dir =>
          // Get the full path of all files in the directory
          readdir(dir).then(files => files.map(file => path.resolve(dir, file)))
        )
      ).then(flatten);
    });
};
