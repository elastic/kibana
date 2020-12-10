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
import { get } from 'lodash';
import { run, KibanaPlatformPlugin } from '@kbn/dev-utils';
import { getPluginDeps, findPlugins } from './plugin_discovery';

interface AllOptions {
  id?: string;
  examples?: boolean;
  extraPluginScanDirs?: string[];
}

run(
  async ({ flags, log }) => {
    const { examples = false, extraPluginScanDirs = [] } = flags as AllOptions;

    const pluginMap = findPlugins({
      oss: false,
      examples,
      extraPluginScanDirs,
    });

    const readyToMigrate = new Set<KibanaPlatformPlugin>();
    for (const pluginId of pluginMap.keys()) {
      const { deps, errors } = getPluginDeps({
        pluginMap,
        id: pluginId,
      });

      if (deps.size === 0 && errors.size === 0) {
        readyToMigrate.add(pluginMap.get(pluginId)!);
      }
    }

    const notMigratedPlugins = [...readyToMigrate].filter(
      (plugin) => !isMigratedToTsProjectRefs(plugin.directory)
    );
    if (notMigratedPlugins.length > 0) {
      log.info(
        `Dependencies ready to migrate to TS project refs:\n${notMigratedPlugins
          .map((p) => p.manifest.id)
          .join('\n')}`
      );
    }
  },
  {
    flags: {
      boolean: ['examples'],
      string: ['id'],
      default: {
        examples: false,
      },
      allowUnexpected: false,
      help: `
        --examples            Include examples folder
        --extraPluginScanDirs Include extra scan folder
      `,
    },
  }
);

function isMigratedToTsProjectRefs(dir: string): boolean {
  try {
    const path = Path.join(dir, 'tsconfig.json');
    const content = Fs.readFileSync(path, { encoding: 'utf8' });
    return get(JSON.parse(content), 'compilerOptions.composite', false);
  } catch (e) {
    return false;
  }
}
