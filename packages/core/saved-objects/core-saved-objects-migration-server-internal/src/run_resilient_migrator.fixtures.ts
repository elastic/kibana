/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const createRegistry = (types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      migrations: {},
      ...type,
    })
  );
  return registry;
};

export const indexTypesMapMock = {
  '.my-index': ['testtype', 'testtype2'],
  '.my-task-index': ['testtasktype'],
  '.my-complementary-index': ['testtype3'],
};

export const savedObjectTypeRegistryMock = createRegistry([
  // typeRegistry depicts an updated index map:
  //   .my-index: ['testtype', 'testtype3'],
  //   .my-other-index: ['testtype2'],
  //   .my-task-index': ['testtasktype'],
  {
    name: 'testtype',
    migrations: { '8.2.3': jest.fn().mockImplementation((doc) => doc) },
  },
  {
    name: 'testtype2',
    // We are moving 'testtype2' from '.my-index' to '.other-index'
    indexPattern: '.other-index',
  },
  {
    name: 'testtasktype',
    indexPattern: '.my-task-index',
  },
  {
    // We are moving 'testtype3' from '.my-complementary-index' to '.my-index'
    name: 'testtype3',
  },
]);
