/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings } from './build_active_mappings';
import { getUpdatedRootFields, getUpdatedTypes } from './compare_mappings';
import { diffMappings } from './diff_mappings';

jest.mock('./compare_mappings');
const getUpdatedRootFieldsMock = getUpdatedRootFields as jest.MockedFn<typeof getUpdatedRootFields>;
const getUpdatedTypesMock = getUpdatedTypes as jest.MockedFn<typeof getUpdatedTypes>;

const dummyMappings: IndexMapping = {
  _meta: {
    mappingVersions: { foo: '10.1.0' },
  },
  dynamic: 'strict',
  properties: {},
};

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

const dummyHashToVersionMap = {
  'foo|someHash': '10.1.0',
};

describe('diffMappings', () => {
  beforeEach(() => {
    getUpdatedRootFieldsMock.mockReset();
    getUpdatedTypesMock.mockReset();
  });

  test('is different if dynamic is different', () => {
    const indexMappings = dummyMappings;
    const appMappings: IndexMapping = {
      ...dummyMappings,
      dynamic: false,
    };

    expect(
      diffMappings({ indexTypes: ['foo'], appMappings, indexMappings, latestMappingsVersions: {} })!
        .changedProp
    ).toEqual('dynamic');
  });

  test('is different if _meta is missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = dummyMappings;

    expect(
      diffMappings({ indexTypes: ['foo'], appMappings, indexMappings, latestMappingsVersions: {} })!
        .changedProp
    ).toEqual('_meta');
  });

  test('is different if migrationMappingPropertyHashes and mappingVersions are missing in indexMappings', () => {
    const indexMappings: IndexMapping = {
      _meta: {},
      dynamic: 'strict',
      properties: {},
    };
    const appMappings: IndexMapping = dummyMappings;

    expect(
      diffMappings({ indexTypes: ['foo'], appMappings, indexMappings, latestMappingsVersions: {} })!
        .changedProp
    ).toEqual('_meta');
  });

  describe('if a root field has changed', () => {
    test('returns that root field', () => {
      getUpdatedRootFieldsMock.mockReturnValueOnce(['references']);

      expect(
        diffMappings({
          indexTypes: ['foo'],
          appMappings: updatedMappings,
          indexMappings: initialMappings,
          latestMappingsVersions: {},
        })
      ).toEqual({ changedProp: 'properties.references' });

      expect(getUpdatedRootFieldsMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedRootFieldsMock).toHaveBeenCalledWith(initialMappings);
      expect(getUpdatedTypesMock).not.toHaveBeenCalled();
    });
  });

  describe('if some types have changed', () => {
    test('returns a changed type', () => {
      getUpdatedRootFieldsMock.mockReturnValueOnce([]);
      getUpdatedTypesMock.mockReturnValueOnce(['foo', 'bar']);

      expect(
        diffMappings({
          indexTypes: ['foo', 'bar', 'baz'],
          appMappings: updatedMappings,
          indexMappings: initialMappings,
          latestMappingsVersions: {
            foo: '10.1.0',
          },
          hashToVersionMap: dummyHashToVersionMap,
        })
      ).toEqual({ changedProp: 'properties.foo' });

      expect(getUpdatedRootFieldsMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedRootFieldsMock).toHaveBeenCalledWith(initialMappings);
      expect(getUpdatedTypesMock).toHaveBeenCalledTimes(1);
      expect(getUpdatedTypesMock).toHaveBeenCalledWith({
        indexTypes: ['foo', 'bar', 'baz'],
        indexMeta: initialMappings._meta,
        latestMappingsVersions: {
          foo: '10.1.0',
        },
        hashToVersionMap: dummyHashToVersionMap,
      });
    });
  });

  describe('if no root field or types have changed', () => {
    test('returns undefined', () => {
      getUpdatedRootFieldsMock.mockReturnValueOnce([]);
      getUpdatedTypesMock.mockReturnValueOnce([]);

      expect(
        diffMappings({
          indexTypes: ['foo', 'bar', 'baz'],
          appMappings: updatedMappings,
          indexMappings: initialMappings,
          latestMappingsVersions: {
            foo: '10.1.0',
          },
          hashToVersionMap: dummyHashToVersionMap,
        })
      ).toBeUndefined();
    });
  });
});
