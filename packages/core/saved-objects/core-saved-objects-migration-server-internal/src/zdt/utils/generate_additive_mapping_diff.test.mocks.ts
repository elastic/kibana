/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getBaseMappingsMock = jest.fn();

jest.doMock('../../core/build_active_mappings', () => {
  const actual = jest.requireActual('../../core/build_active_mappings');
  return {
    ...actual,
    getBaseMappings: getBaseMappingsMock,
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
