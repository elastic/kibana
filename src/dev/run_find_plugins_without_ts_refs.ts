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
import { getPluginDeps, findPlugins } from './plugin_discovery';

interface AllOptions {
  id?: string;
  examples?: boolean;
  extraPluginScanDirs?: string[];
}

run(
  async ({ flags, log }) => {
    const { examples = false, extraPluginScanDirs = [], id } = flags as AllOptions;

    if (!id) {
      throw new Error('Plugin id required');
    }

    const pluginMap = findPlugins({
      oss: false,
      examples,
      extraPluginScanDirs,
    });

    const result = getPluginDeps({
      pluginMap,
      id,
    });

    if (result.errors.size > 0) {
      result.errors.forEach((error) => {
        log.warning(
          `Circular refs detected: ${[...error.stack, error.to].map((p) => `[${p}]`).join(' --> ')}`
        );
      });
    }

    const notMigratedPlugins = [...result.deps].filter(
      (plugin) => !isMigratedToTsProjectRefs(plugin.directory)
    );
    if (notMigratedPlugins.length > 0) {
      log.info(
        `Dependencies haven't been migrated to TS project refs yet:\n${notMigratedPlugins
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
        --id                  Plugin id to perform deps search for
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
