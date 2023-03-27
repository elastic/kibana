/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  compareModelVersionsMock,
  getModelVersionsFromMappingsMock,
  getModelVersionMapForTypesMock,
} from './check_version_compatibility.test.mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  ModelVersionMap,
  CompareModelVersionResult,
} from '@kbn/core-saved-objects-base-server-internal';
import { checkVersionCompatibility } from './check_version_compatibility';
import { createType } from '../test_helpers';

describe('checkVersionCompatibility', () => {
  const deletedTypes = ['some-deleted-type'];

  let types: SavedObjectsType[];
  let mappings: IndexMapping;

  beforeEach(() => {
    compareModelVersionsMock.mockReset().mockReturnValue({});
    getModelVersionsFromMappingsMock.mockReset().mockReturnValue({});
    getModelVersionMapForTypesMock.mockReset().mockReturnValue({ status: 'equal' });

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

    expect(getModelVersionMapForTypesMock).toHaveBeenCalledTimes(1);
    expect(getModelVersionMapForTypesMock).toHaveBeenCalledWith(types);
  });

  it('calls getModelVersionsFromMappings with the correct parameters', () => {
    checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(getModelVersionsFromMappingsMock).toHaveBeenCalledTimes(1);
    expect(getModelVersionsFromMappingsMock).toHaveBeenCalledWith({
      mappings,
      source: 'mappingVersions',
    });
  });

  it('calls compareModelVersions with the correct parameters', () => {
    const appVersions: ModelVersionMap = { foo: 2, bar: 2 };
    const indexVersions: ModelVersionMap = { foo: 1, bar: 1 };

    getModelVersionMapForTypesMock.mockReturnValue(appVersions);
    getModelVersionsFromMappingsMock.mockReturnValue(indexVersions);

    checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(compareModelVersionsMock).toHaveBeenCalledTimes(1);
    expect(compareModelVersionsMock).toHaveBeenCalledWith({
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
    compareModelVersionsMock.mockReturnValue(expected);

    const result = checkVersionCompatibility({
      types,
      mappings,
      source: 'mappingVersions',
      deletedTypes,
    });

    expect(result).toEqual(expected);
  });
});
