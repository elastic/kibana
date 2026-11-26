/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
export const getVirtualVersionsFromMappingsMock: Mock = vi.fn();
export const compareVirtualVersionsMock: Mock = vi.fn();
export const getVirtualVersionMapMock: Mock = vi.fn();

vi.doMock('@kbn/core-saved-objects-base-server-internal', async () => {
  const actual = await vi.importActual('@kbn/core-saved-objects-base-server-internal');
  const mockedModule = {
    ...actual,
    getVirtualVersionsFromMappings: getVirtualVersionsFromMappingsMock,
    compareVirtualVersions: compareVirtualVersionsMock,
    getVirtualVersionMap: getVirtualVersionMapMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const getUpdatedRootFieldsMock: Mock = vi.fn();

vi.doMock('../../core/compare_mappings', async () => {
  const actual = await vi.importActual('../../core/compare_mappings');
  const mockedModule = {
    ...actual,
    getUpdatedRootFields: getUpdatedRootFieldsMock,
  };
  return { ...mockedModule, default: mockedModule };
});
