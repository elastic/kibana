/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { getNonUniqueEntries } from './get_non_unique_entries';

describe('#getNonUniqueEntries', () => {
  const namespace = 'foo-ns';
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isSingleNamespace.mockImplementation((type) => {
      return type !== 'multiple';
    });
  });

  describe('objects with namespace unspecified', () => {
    const foo1 = { type: 'foo', id: '1' };
    const foo2 = { type: 'foo', id: '2' }; // same type as foo1, different ID
    const bar1 = { type: 'bar', id: '1' }; // same ID as foo1, different type

    it('returns empty array if entries are unique', () => {
      expect(getNonUniqueEntries([foo1, foo2, bar1], typeRegistry, namespace)).toEqual([]);
    });

    it('returns non-empty array for non-unique results', () => {
      expect(getNonUniqueEntries([foo1, foo2, foo1], typeRegistry, namespace)).toEqual([
        `${namespace}:${foo1.type}:${foo1.id}`,
      ]);
    });

    it('returns all the duplicates', () => {
      expect(getNonUniqueEntries([foo1, foo2, foo1, foo2], typeRegistry, namespace)).toEqual([
        `${namespace}:${foo1.type}:${foo1.id}`,
        `${namespace}:${foo2.type}:${foo2.id}`,
      ]);
    });
  });

  describe('objects with namespace specified', () => {
    it('returns empty array for single-ns objects with same id/type from different namespaces', () => {
      expect(
        getNonUniqueEntries(
          [
            { type: 'single', id: '1', namespaces: ['ns-1'] },
            { type: 'single', id: '1', namespaces: ['ns-2'] },
          ],
          typeRegistry,
          namespace
        )
      ).toEqual([]);
    });

    it('finds duplicates for single-ns objects with same id/type from different namespaces', () => {
      expect(
        getNonUniqueEntries(
          [
            { type: 'single', id: '1', namespaces: ['ns-1'] },
            { type: 'single', id: '1', namespaces: ['ns-1'] },
          ],
          typeRegistry,
          namespace
        )
      ).toEqual(['ns-1:single:1']);
    });
  });
});
