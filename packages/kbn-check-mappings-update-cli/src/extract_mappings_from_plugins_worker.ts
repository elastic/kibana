/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { PluginSystemOverrides } from '@kbn/core-plugins-server-internal';
import { mergeTypes } from '@kbn/core-saved-objects-migration-server-internal';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

export interface Result {
  mappings: SavedObjectsTypeMappingDefinitions;
}

(async () => {
  if (!process.send) {
    throw new Error('worker must be run in a node.js fork');
  }

  PluginSystemOverrides.setAllPluginsEnabled();
  const root = createRootWithCorePlugins(
    {
      logging: {
        loggers: [{ name: 'root', level: 'info', appenders: ['console'] }],
      },
    },
    {
      basePath: false,
      cache: false,
      dev: true,
      disableOptimizer: true,
      silent: false,
      dist: false,
      oss: false,
      runExamples: false,
      watch: false,
    }
  );

  await root.preboot();
  const { savedObjects } = await root.setup();
  const result: Result = {
    mappings: mergeTypes(savedObjects.getTypeRegistry().getAllTypes()),
  };
  process.send(result);
})().catch((error) => {
  process.stderr.write(`UNHANDLED ERROR: ${error.stack}`);
  process.exit(1);
});
