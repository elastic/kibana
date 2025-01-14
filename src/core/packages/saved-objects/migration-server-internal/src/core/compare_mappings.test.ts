/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings } from './build_active_mappings';
import { getUpdatedRootFields, getNewAndUpdatedTypes } from './compare_mappings';

describe('getNewAndUpdatedTypes', () => {
  test('returns all types if _meta is missing in indexMappings', () => {
    const indexTypes = ['foo', 'bar'];
    const latestMappingsVersions = {};

    const { newTypes, updatedTypes } = getNewAndUpdatedTypes({
      indexTypes,
      indexMeta: undefined,
      latestMappingsVersions,
    });
    expect(newTypes).toEqual([]);
    expect(updatedTypes).toEqual(['foo', 'bar']);
  });

  test('returns all types if migrationMappingPropertyHashes and mappingVersions are missing in indexMappings', () => {
    const indexTypes = ['foo', 'bar'];
    const indexMeta: IndexMappingMeta = {};
    const latestMappingsVersions = {};

    const { newTypes, updatedTypes } = getNewAndUpdatedTypes({
      indexTypes,
      indexMeta,
      latestMappingsVersions,
    });
    expect(newTypes).toEqual([]);
    expect(updatedTypes).toEqual(['foo', 'bar']);
  });

  describe('when ONLY migrationMappingPropertyHashes exists in indexMappings', () => {
    test('uses the provided hashToVersionMap to compare changes and return new types and types that have changed', async () => {
      const indexTypes = ['type1', 'type2', 'type4'];
      const indexMeta: IndexMappingMeta = {
        migrationMappingPropertyHashes: {
          type1: 'someHash',
          type2: 'anotherHash',
          type3: 'aThirdHash', // will be removed
        },
      };

      const hashToVersionMap = {
        'type1|someHash': '10.1.0',
        'type2|anotherHash': '10.1.0',
        'type3|aThirdHash': '10.1.0',
      };

      const latestMappingsVersions = {
        type1: '10.1.0',
        type2: '10.2.0',
        type4: '10.5.0', // new type, no need to pick it up
      };

      const { newTypes, updatedTypes } = getNewAndUpdatedTypes({
        indexTypes,
        indexMeta,
        latestMappingsVersions,
        hashToVersionMap,
      });
      expect(newTypes).toEqual(['type4']);
      expect(updatedTypes).toEqual(['type2']);
    });
  });

  describe('when mappingVersions exist in indexMappings', () => {
    test('compares the modelVersions and returns new types and types that have changed', async () => {
      const indexTypes = ['type1', 'type2', 'type4'];

      const indexMeta: IndexMappingMeta = {
        mappingVersions: {
          type1: '10.1.0',
          type2: '10.1.0',
          type3: '10.1.0', // will be removed
        },
        // ignored, cause mappingVersions is present
        migrationMappingPropertyHashes: {
          type1: 'someHash',
          type2: 'anotherHash',
          type3: 'aThirdHash',
        },
      };

      const latestMappingsVersions = {
        type1: '10.1.0',
        type2: '10.2.0',
        type4: '10.5.0', // new type, no need to pick it up
      };

      const hashToVersionMap = {
        // empty on purpose, not used as mappingVersions is present in indexMappings
      };

      const { newTypes, updatedTypes } = getNewAndUpdatedTypes({
        indexTypes,
        indexMeta,
        latestMappingsVersions,
        hashToVersionMap,
      });
      expect(newTypes).toEqual(['type4']);
      expect(updatedTypes).toEqual(['type2']);
    });
  });
});

describe('getUpdatedRootFields', () => {
  it('deep compares provided indexMappings against the current baseMappings()', () => {
    const updatedFields = getUpdatedRootFields({
      properties: {
        ...getBaseMappings().properties,
        namespace: {
          type: 'text',
        },
        references: {
          type: 'nested',
          properties: {
            ...getBaseMappings().properties.references.properties,
            description: {
              type: 'text',
            },
          },
        },
      },
    });

    expect(updatedFields).toEqual(['namespace', 'references']);
  });

  it('ignores fields not being present on the base mapping for the diff', () => {
    const updatedFields = getUpdatedRootFields({
      properties: {
        ...getBaseMappings().properties,
        someUnknownField: {
          type: 'text',
        },
      },
    });

    expect(updatedFields).toEqual([]);
  });

  it('ignores fields not being present on the base mapping even with nested props', () => {
    const updatedFields = getUpdatedRootFields({
      properties: {
        ...getBaseMappings().properties,
        someTypeProps: {
          properties: {
            foo: { type: 'text' },
          },
        },
      },
    });

    expect(updatedFields).toEqual([]);
  });
});
