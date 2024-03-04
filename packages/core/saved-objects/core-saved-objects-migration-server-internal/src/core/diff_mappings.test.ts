/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings } from './build_active_mappings';
import { getUpdatedRootFields, getUpdatedTypes } from './compare_mappings';
import { diffMappings } from './diff_mappings';

jest.mock('./compare_mappings');
const getUpdatedRootFieldsMock = getUpdatedRootFields as jest.MockedFn<typeof getUpdatedRootFields>;
const getUpdatedTypesMock = getUpdatedTypes as jest.MockedFn<typeof getUpdatedTypes>;

const initialMappings: IndexMapping = {
  _meta: {
    mappingVersions: { foo: '10.1.0' },
  },
  dynamic: 'strict',
  properties: {
    ...getBaseMappings().properties,
    foo: {
      type: 'text',
    },
  },
};
const updatedMappings: IndexMapping = {
  _meta: {
    mappingVersions: { foo: '10.2.0' },
  },
  dynamic: 'strict',
  properties: {
    ...getBaseMappings().properties,
    foo: {
      type: 'keyword',
    },
  },
};

describe('diffMappings', () => {
  beforeEach(() => {
    getUpdatedRootFieldsMock.mockReset();
    getUpdatedTypesMock.mockReset();
  });

  test('is different if dynamic is different', () => {
    const indexMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0' },
      },
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0' },
      },
      dynamic: false,
      properties: {},
    };

    expect(diffMappings({ indexMappings, appMappings })!.changedProp).toEqual('dynamic');
  });

  test('is different if _meta is missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings({ indexMappings, appMappings })!.changedProp).toEqual('_meta');
  });

  test('is different if migrationMappingPropertyHashes and mappingVersions are missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      _meta: {},
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = {
      _meta: {
        mappingVersions: { foo: '10.1.0' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings({ indexMappings, appMappings })!.changedProp).toEqual('_meta');
  });

  describe('if a root field has changed', () => {
    test('returns that root field', () => {
      getUpdatedRootFieldsMock.mockReturnValueOnce(['references']);

      expect(
        diffMappings({ indexMappings: initialMappings, appMappings: updatedMappings })
      ).toEqual({ changedProp: 'properties.references' });

      expect(getUpdatedRootFieldsMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedRootFieldsMock).toHaveBeenCalledWith(initialMappings);
      expect(getUpdatedTypesMock).not.toHaveBeenCalled();
    });
  });

  describe('if some types have changed', () => {
    test('returns a changed type', () => {
      const hashToVersionMap = {
        'foo|someHash': '10.1.0',
      };

      getUpdatedRootFieldsMock.mockReturnValueOnce([]);
      getUpdatedTypesMock.mockReturnValueOnce(['foo', 'bar', 'baz']);

      expect(
        diffMappings({
          indexMappings: initialMappings,
          appMappings: updatedMappings,
          hashToVersionMap,
        })
      ).toEqual({ changedProp: 'properties.foo' });

      expect(getUpdatedRootFieldsMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedRootFieldsMock).toHaveBeenCalledWith(initialMappings);
      expect(getUpdatedTypesMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedTypesMock).toHaveBeenCalledWith({
        indexMappings: initialMappings,
        appMappings: updatedMappings,
        hashToVersionMap,
      });
    });
  });

  describe('if no root field or types have changed', () => {
    test('returns undefined', () => {
      getUpdatedRootFieldsMock.mockReturnValueOnce([]);
      getUpdatedTypesMock.mockReturnValueOnce([]);

      expect(
        diffMappings({
          indexMappings: initialMappings,
          appMappings: initialMappings,
        })
      ).toBeUndefined();
    });
  });
});
