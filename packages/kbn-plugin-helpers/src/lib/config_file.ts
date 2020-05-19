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

import { resolve } from 'path';
import { readFileSync } from 'fs';

const configFileNames = ['.kibana-plugin-helpers.json', '.kibana-plugin-helpers.dev.json'];

interface Config {
  [key: string]: unknown;
}

const configCache = new Map<string, Config>();

export function configFile(root: string = process.cwd()) {
  if (configCache.has(root)) {
    return configCache.get(root)!;
  }

  // config files to read from, in the order they are merged together
  let config: Config = {};
  for (const name of configFileNames) {
    try {
      config = JSON.parse(readFileSync(resolve(root, name), 'utf8'));
    } catch (e) {
      // rethrow error unless it's complaining about file not existing
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  const deprecationMsg =
    'has been removed from `@kbn/plugin-helpers`. ' +
    'During development your plugin must live in `./plugins/{pluginName}` ' +
    'inside the Kibana folder or `../kibana-extra/{pluginName}` ' +
    'relative to the Kibana folder to work with this package.\n';

  if (config.kibanaRoot) {
    throw new Error('The `kibanaRoot` config option ' + deprecationMsg);
  }
  if (process.env.KIBANA_ROOT) {
    throw new Error('The `KIBANA_ROOT` environment variable ' + deprecationMsg);
  }

  // use resolve to ensure correct resolution of paths
  if (Array.isArray(config.includePlugins)) {
    config.includePlugins = config.includePlugins.map((path: string) => resolve(root, path));
  }

  configCache.set(root, config);
  return config;
}
