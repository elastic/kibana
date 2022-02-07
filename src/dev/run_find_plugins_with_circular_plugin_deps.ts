/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-utils';
import { getPluginDeps, findPlugins } from './plugin_discovery';

interface AllOptions {
  examples?: boolean;
  extraPluginScanDirs?: string[];
}

run(
  async ({ flags, log }) => {
    const { examples = false, extraPluginScanDirs = [] } = flags as AllOptions;

    // if (!id) {
    //   throw new Error('Plugin id required');
    // }

    const pluginMap = findPlugins({
      oss: false,
      examples,
      extraPluginScanDirs,
    });

    const circularRefs = new Set<string>();

    for (const {
      manifest: { id },
    } of pluginMap.values()) {
      const result = getPluginDeps({
        pluginMap,
        id,
      });

      if (result.errors.size > 0) {
        result.errors.forEach((error) => {
          circularRefs.add(
            `Circular refs detected: ${[...error.stack, error.to]
              .map((p) => `[${p}]`)
              .join(' --> ')}`
          );
        });
      }
    }

    [...circularRefs].forEach((warning) => log.warning(warning));
  },
  {
    flags: {
      boolean: ['examples'],
      // string: ['id'],
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
