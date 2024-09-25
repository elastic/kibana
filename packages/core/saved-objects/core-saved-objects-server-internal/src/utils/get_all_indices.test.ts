/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SavedObjectsType, MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { getAllIndices } from './get_all_indices';

describe('getAllIndices', () => {
  const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
    name: 'test',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const createRegistry = (...types: Array<Partial<SavedObjectsType>>): SavedObjectTypeRegistry => {
    const registry = new SavedObjectTypeRegistry();
    types.forEach((type) => {
      registry.registerType(createType(type));
    });

    return registry;
  };

  it('returns the indices that are used by registered types', () => {
    const registry = createRegistry(
      { name: 'type_1' },
      { name: 'type_2', indexPattern: '.kibana_ingest' }
    );
    expect(getAllIndices({ registry })).toEqual([MAIN_SAVED_OBJECT_INDEX, '.kibana_ingest']);
  });

  it('returns each index only once', () => {
    const registry = createRegistry(
      { name: 'type_1' },
      { name: 'type_2', indexPattern: '.kibana_foo' },
      { name: 'type_3' },
      { name: 'type_4', indexPattern: '.kibana_foo' }
    );
    expect(getAllIndices({ registry })).toEqual([MAIN_SAVED_OBJECT_INDEX, '.kibana_foo']);
  });
});
