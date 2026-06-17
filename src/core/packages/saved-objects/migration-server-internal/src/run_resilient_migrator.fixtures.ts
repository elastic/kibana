/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export const hashToVersionMapMock = {
  'testtype|someHash': '10.1.0',
  'testtype2|anotherHash': '10.2.0',
  'testtasktype|hashesAreCool': '10.1.0',
  'testtype3|yetAnotherHash': '10.1.0',
};

export const savedObjectTypeRegistryMock = createRegistry([
  {
    name: 'testtype',
    migrations: { '8.2.3': jest.fn().mockImplementation((doc) => doc) },
  },
  {
    name: 'testtype2',
    indexPattern: '.other_index',
  },
  {
    name: 'testtasktype',
    indexPattern: '.task_index',
  },
  {
    name: 'testtype3',
  },
]);
