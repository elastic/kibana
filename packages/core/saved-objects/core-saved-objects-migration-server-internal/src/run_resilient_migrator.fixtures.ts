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
  '.my_index': ['testtype', 'testtype2'],
  '.task_index': ['testtasktype'],
  '.complementary_index': ['testtype3'],
};

export const hashToVersionMapMock = {
  'testtype|someHash': '10.1.0',
  'testtype2|anotherHash': '10.2.0',
  'testtasktype|hashesAreCool': '10.1.0',
  'testtype3|yetAnotherHash': '10.1.0',
};

export const savedObjectTypeRegistryMock = createRegistry([
  // typeRegistry depicts an updated index map:
  //   .my_index: ['testtype', 'testtype3'],
  //   .other_index: ['testtype2'],
  //   .task_index': ['testtasktype'],
  {
    name: 'testtype',
    migrations: { '8.2.3': jest.fn().mockImplementation((doc) => doc) },
  },
  {
    name: 'testtype2',
    // We are moving 'testtype2' from '.my_index' to '.other_index'
    indexPattern: '.other_index',
  },
  {
    name: 'testtasktype',
    indexPattern: '.task_index',
  },
  {
    // We are moving 'testtype3' from '.complementary_index' to '.my_index'
    name: 'testtype3',
  },
]);
