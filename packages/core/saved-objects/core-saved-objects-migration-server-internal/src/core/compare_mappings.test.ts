/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings } from './build_active_mappings';
import { getUpdatedTypes, getUpdatedRootFields } from './compare_mappings';

describe('getUpdatedTypes', () => {
  test('returns all types if _meta is missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0', bar: '10.2.0' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(getUpdatedTypes({ indexMappings, appMappings })).toEqual(['foo', 'bar']);
  });

  test('returns all types if migrationMappingPropertyHashes and mappingVersions are missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      dynamic: 'strict',
      properties: {},
      _meta: {},
    };
    const appMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0', bar: '10.2.0' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(getUpdatedTypes({ indexMappings, appMappings })).toEqual(['foo', 'bar']);
  });

  describe('when ONLY migrationMappingPropertyHashes exists in indexMappings', () => {
    test('uses the provided hashToVersionMap to compare changes and return only the types that have changed', async () => {
      const indexMappings: IndexMapping = {
        dynamic: 'strict',
        properties: {},
        _meta: {
          migrationMappingPropertyHashes: {
            type1: 'someHash',
            type2: 'anotherHash',
            type3: 'aThirdHash', // will be removed
          },
        },
      };
      const appMappings: IndexMapping = {
        dynamic: 'strict',
        properties: {},
        _meta: {
          mappingVersions: {
            type1: '10.1.0', // remains the same
            type2: '10.2.0', // updated
            type4: '10.1.0', // new type
          },
        },
      };

      const hashToVersionMap = {
        'type1|someHash': '10.1.0',
        'type2|anotherHash': '10.1.0',
        'type3|aThirdHash': '10.1.0',
      };

      expect(getUpdatedTypes({ indexMappings, appMappings, hashToVersionMap })).toEqual([
        'type2',
        'type4',
      ]);
    });
  });

  describe('when mappingVersions exist in indexMappings', () => {
    test('compares the modelVersions and returns only the types that have changed', async () => {
      const indexMappings: IndexMapping = {
        dynamic: 'strict',
        properties: {},
        _meta: {
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
        },
      };
      const appMappings: IndexMapping = {
        dynamic: 'strict',
        properties: {},
        _meta: {
          mappingVersions: {
            type1: '10.1.0', // remains the same
            type2: '10.2.0', // updated
            type4: '10.1.0', // new type
          },
        },
      };

      const hashToVersionMap = {
        // empty on purpose, not used as mappingVersions is present in indexMappings
      };

      expect(getUpdatedTypes({ indexMappings, appMappings, hashToVersionMap })).toEqual([
        'type2',
        'type4',
      ]);
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
});
