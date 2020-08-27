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

import {
  REPO_ROOT,
  parseKibanaPlatformPlugin,
  KibanaPlatformPlugin,
  createFailError,
} from '@kbn/dev-utils';

export type Plugin = KibanaPlatformPlugin;

export function loadKibanaPlatformPlugin(pluginDir: string) {
  const parentDir = Path.resolve(pluginDir, '..');

  const isFixture = pluginDir.includes('__fixtures__');
  const isExample = Path.basename(parentDir) === 'examples';
  const isRootPlugin = parentDir === Path.resolve(REPO_ROOT, 'plugins');

  if (isFixture || isExample || isRootPlugin) {
    return parseKibanaPlatformPlugin(Path.resolve(pluginDir, 'kibana.json'));
  }

  throw createFailError(
    `Plugin located at [${pluginDir}] must be moved to the plugins directory at the root of the Kibana repo`
  );
}
