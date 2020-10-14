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
import { REPO_ROOT } from '@kbn/dev-utils';
import { getPluginSearchPaths } from '@kbn/config';
import { KibanaPlatformPlugin, simpleKibanaPlatformPluginDiscovery } from '@kbn/dev-utils';

export interface SearchOptions {
  oss: boolean;
  examples: boolean;
  extraPluginScanDirs: string[];
}

export function findPlugins({
  oss,
  examples,
  extraPluginScanDirs,
}: SearchOptions): Map<string, KibanaPlatformPlugin> {
  const pluginSearchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    oss,
    examples,
  });

  for (const extraScanDir of extraPluginScanDirs) {
    if (!Path.isAbsolute(extraScanDir)) {
      throw new TypeError('extraPluginScanDirs must all be absolute paths');
    }
    pluginSearchPaths.push(extraScanDir);
  }

  const plugins = simpleKibanaPlatformPluginDiscovery(pluginSearchPaths, []);
  return new Map(plugins.map((p) => [p.manifest.id, p]));
}
