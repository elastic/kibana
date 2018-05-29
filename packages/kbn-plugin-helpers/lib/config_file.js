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

const resolve = require('path').resolve;
const readFileSync = require('fs').readFileSync;

const configFiles = [
  '.kibana-plugin-helpers.json',
  '.kibana-plugin-helpers.dev.json',
];
const configCache = {};

module.exports = function(root) {
  if (!root) root = process.cwd();

  if (configCache[root]) {
    return configCache[root];
  }

  // config files to read from, in the order they are merged together
  let config = (configCache[root] = {});

  configFiles.forEach(function(configFile) {
    try {
      const content = JSON.parse(readFileSync(resolve(root, configFile)));
      config = Object.assign(config, content);
    } catch (e) {
      // rethrow error unless it's complaining about file not existing
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  });

  const deprecationMsg =
    'has been removed from `@kbn/plugin-helpers`. ' +
    'During development your plugin must be located in `../kibana-extra/{pluginName}` ' +
    'relative to the Kibana directory to work with this package.\n';

  if (config.kibanaRoot) {
    throw new Error('The `kibanaRoot` config option ' + deprecationMsg);
  }
  if (process.env.KIBANA_ROOT) {
    throw new Error('The `KIBANA_ROOT` environment variable ' + deprecationMsg);
  }

  // use resolve to ensure correct resolution of paths
  const { includePlugins } = config;
  if (includePlugins)
    config.includePlugins = includePlugins.map(path => resolve(root, path));

  return config;
};
