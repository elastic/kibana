/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getVirtualVersionsFromMappingsMock = jest.fn();
export const compareVirtualVersionsMock = jest.fn();
export const getVirtualVersionMapMock = jest.fn();

jest.doMock('@kbn/core-saved-objects-base-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-base-server-internal');
  return {
    ...actual,
    getVirtualVersionsFromMappings: getVirtualVersionsFromMappingsMock,
    compareVirtualVersions: compareVirtualVersionsMock,
    getVirtualVersionMap: getVirtualVersionMapMock,
  };
});

export const getUpdatedRootFieldsMock = jest.fn();

jest.doMock('../../core/compare_mappings', () => {
  const actual = jest.requireActual('../../core/compare_mappings');
  return {
    ...actual,
    getUpdatedRootFields: getUpdatedRootFieldsMock,
  };
});
