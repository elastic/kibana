/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType, SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';

export const USER_STORAGE_SO_TYPE = 'user-storage';
export const USER_STORAGE_GLOBAL_SO_TYPE = 'user-storage-global';

const USER_STORAGE_MAPPINGS = {
  dynamic: false as const,
  properties: {
    userId: { type: 'keyword' as const },
  },
};

const userStorageAttributesSchemaV1 = schema.object({
  userId: schema.string(),
  data: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

const USER_STORAGE_MODEL_VERSIONS: SavedObjectsModelVersionMap = {
  1: {
    changes: [],
    schemas: {
      forwardCompatibility: userStorageAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: userStorageAttributesSchemaV1,
    },
  },
};

/**
 * Space-scoped per-user storage. One document per user per space.
 * Document ID = profile_uid.
 *
 * Attributes shape: `{ userId: string; data: Record<string, unknown> }`
 * `userId` is indexed for admin queries. `data` is covered by `dynamic: false`.
 */
export const userStorageType: SavedObjectsType = {
  name: USER_STORAGE_SO_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated', // ability to support access control for user storage in the future, if needed
  mappings: USER_STORAGE_MAPPINGS,
  modelVersions: USER_STORAGE_MODEL_VERSIONS,
};

/**
 * Global per-user storage (cross-space). One document per user.
 * Document ID = profile_uid.
 *
 * Same attributes shape as `user-storage`.
 */
export const userStorageGlobalType: SavedObjectsType = {
  name: USER_STORAGE_GLOBAL_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: USER_STORAGE_MAPPINGS,
  modelVersions: USER_STORAGE_MODEL_VERSIONS,
};
