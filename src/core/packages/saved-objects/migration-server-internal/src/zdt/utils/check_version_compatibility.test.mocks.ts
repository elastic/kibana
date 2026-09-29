/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getVirtualVersionsFromMappingsMock = vi.fn();
export const compareVirtualVersionsMock = vi.fn();
export const getVirtualVersionMapMock = vi.fn();

vi.doMock('@kbn/core-saved-objects-base-server-internal', async () => {
  const actual = (await vi.importActual('@kbn/core-saved-objects-base-server-internal'));
  return {
    ...actual,
    getVirtualVersionsFromMappings: getVirtualVersionsFromMappingsMock,
    compareVirtualVersions: compareVirtualVersionsMock,
    getVirtualVersionMap: getVirtualVersionMapMock,
  };
});

export const getUpdatedRootFieldsMock = vi.fn();

vi.doMock('../../core/compare_mappings', async () => {
  const actual = (await vi.importActual('../../core/compare_mappings'));
  return {
    ...actual,
    getUpdatedRootFields: getUpdatedRootFieldsMock,
  };
});
