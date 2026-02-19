/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { defaultKibanaIndex } from '@kbn/migrator-test-kit';
import { OLD_TYPE_NO_MIGRATIONS } from './no_migrations';
import { OLD_TYPE_WITH_MIGRATIONS } from './migrations';
import { PERSON_SO_TYPE } from './person';

function createSavedObjectType<T>(properties: Partial<SavedObjectsType<T>>): SavedObjectsType<T> {
  return {
    name: 'unnamed',
    indexPattern: defaultKibanaIndex,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        foo: { type: 'keyword' },
        bar: { type: 'boolean' },
      },
    },
    ...properties,
  };
}

export const TEST_TYPES: SavedObjectsType<any>[] = [
  OLD_TYPE_NO_MIGRATIONS,
  OLD_TYPE_WITH_MIGRATIONS,
  PERSON_SO_TYPE,
].map((partial) => createSavedObjectType(partial));
