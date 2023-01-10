/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { PluginSystemOverrides } from '@kbn/core-plugins-server-internal';
import { mergeTypes } from '@kbn/core-saved-objects-migration-server-internal';

export async function extractMappingsFromPlugins(): Promise<SavedObjectsTypeMappingDefinitions> {
  PluginSystemOverrides.setAllPluginsEnabled();
  const root = createRootWithCorePlugins(
    {},
    {
      basePath: false,
      cache: false,
      dev: true,
      disableOptimizer: true,
      silent: true,
      dist: false,
      oss: false,
      runExamples: false,
      watch: false,
    }
  );

  await root.preboot();
  const { savedObjects } = await root.setup();
  // Skip root.start
  await root.shutdown();

  return mergeTypes(savedObjects.getTypeRegistry().getAllTypes());
}
