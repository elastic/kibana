/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import JSON5 from 'json5';
import { get } from 'lodash';
import { run } from '@kbn/dev-utils';
import { KibanaPlatformPlugin } from '@kbn/plugin-discovery';
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

      const allDepsMigrated = [...deps].every((p) => isMigratedToTsProjectRefs(p.directory));
      if (allDepsMigrated && errors.size === 0) {
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
    return get(JSON5.parse(content), 'compilerOptions.composite', false);
  } catch (e) {
    return false;
  }
}
