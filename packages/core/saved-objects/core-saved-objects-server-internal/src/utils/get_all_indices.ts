/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';

export const getAllIndices = ({ registry }: { registry: SavedObjectTypeRegistry }): string[] => {
  return [
    ...new Set(registry.getAllTypes().map((type) => type.indexPattern ?? MAIN_SAVED_OBJECT_INDEX)),
  ];
};
