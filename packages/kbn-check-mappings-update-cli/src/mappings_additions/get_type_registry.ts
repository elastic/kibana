/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';

export const getTypeRegistry = async (): Promise<ISavedObjectTypeRegistry> => {
  const root = createRootWithCorePlugins(
    {
      migrations: { skip: true },
      elasticsearch: { skipStartupConnectionCheck: true },
    },
    {
      oss: false,
    }
  );
  await root.preboot();
  const { savedObjects } = await root.setup();
  const typeRegistry = savedObjects.getTypeRegistry();
  await root.shutdown();
  return typeRegistry;
};
