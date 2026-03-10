/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const USER_STORAGE_SO_TYPE = 'user-storage';
export const USER_STORAGE_GLOBAL_SO_TYPE = 'user-storage-global';

/**
 * Space-scoped per-user storage. One document per user per space.
 * Document ID = profile_uid.
 * `dynamic: false` — attributes are stored in _source but not indexed.
 */
export const userStorageType: SavedObjectsType = {
  name: USER_STORAGE_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {},
  },
};

/**
 * Global per-user storage (cross-space). One document per user.
 * Document ID = profile_uid.
 */
export const userStorageGlobalType: SavedObjectsType = {
  name: USER_STORAGE_GLOBAL_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
