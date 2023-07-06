/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  compareVirtualVersionsMock,
  getVirtualVersionMapMock,
  getVirtualVersionsFromMappingsMock,
} from './check_version_compatibility.test.mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  VirtualVersionMap,
  CompareModelVersionResult,
} from '@kbn/core-saved-objects-base-server-internal';
import { checkVersionCompatibility } from './check_version_compatibility';
import { createType } from '../test_helpers';

describe('checkVersionCompatibility', () => {
  const deletedTypes = ['some-deleted-type'];

  let types: SavedObjectsType[];
  let mappings: IndexMapping;

  beforeEach(() => {
    compareVirtualVersionsMock.mockReset().mockReturnValue({});
    getVirtualVersionMapMock.mockReset().mockReturnValue({});
    getVirtualVersionsFromMappingsMock.mockReset().mockReturnValue({ status: 'equal' });

    types = [createType({ name: 'foo' }), createType({ name: 'bar' })];

    mappings = {
      properties: { foo: { type: 'boolean' } },
    };
  });

  it('calls getModelVersionMapForTypes with the correct parameters', () => {
    checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(getVirtualVersionMapMock).toHaveBeenCalledTimes(1);
    expect(getVirtualVersionMapMock).toHaveBeenCalledWith(types);
  });

  it('calls getModelVersionsFromMappings with the correct parameters', () => {
    checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(getVirtualVersionsFromMappingsMock).toHaveBeenCalledTimes(1);
    expect(getVirtualVersionsFromMappingsMock).toHaveBeenCalledWith({
      mappings,
      source: 'mappingVersions',
      knownTypes: ['foo', 'bar'],
    });
  });

  it('calls compareModelVersions with the correct parameters', () => {
    const appVersions: VirtualVersionMap = { foo: '10.2.0', bar: '10.2.0' };
    const indexVersions: VirtualVersionMap = { foo: '10.1.0', bar: '10.1.0' };

    getVirtualVersionMapMock.mockReturnValue(appVersions);
    getVirtualVersionsFromMappingsMock.mockReturnValue(indexVersions);

    checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(compareVirtualVersionsMock).toHaveBeenCalledTimes(1);
    expect(compareVirtualVersionsMock).toHaveBeenCalledWith({
      appVersions,
      indexVersions,
      deletedTypes,
    });
  });

  it('returns the result of the compareModelVersions call', () => {
    const expected: CompareModelVersionResult = {
      status: 'lesser',
      details: {
        greater: [],
        lesser: [],
        equal: [],
      },
    };
    compareVirtualVersionsMock.mockReturnValue(expected);

    const result = checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(result).toEqual(expected);
  });
});
