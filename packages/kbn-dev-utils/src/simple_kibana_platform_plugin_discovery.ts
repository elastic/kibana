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

import globby from 'globby';

import { parseKibanaPlatformPlugin } from './parse_kibana_platform_plugin';

/**
 * Helper to find the new platform plugins.
 */
export function simpleKibanaPlatformPluginDiscovery(scanDirs: string[], pluginPaths: string[]) {
  const patterns = Array.from(
    new Set([
      // find kibana.json files up to 5 levels within the scan dir
      ...scanDirs.reduce(
        (acc: string[], dir) => [
          ...acc,
          Path.resolve(dir, '*/kibana.json'),
          Path.resolve(dir, '*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/*/*/kibana.json'),
        ],
        []
      ),
      ...pluginPaths.map((path) => Path.resolve(path, `kibana.json`)),
    ])
  );

  const manifestPaths = globby.sync(patterns, { absolute: true }).map((path) =>
    // absolute paths returned from globby are using normalize or
    // something so the path separators are `/` even on windows,
    // Path.resolve solves this
    Path.resolve(path)
  );

  return manifestPaths.map(parseKibanaPlatformPlugin);
}
