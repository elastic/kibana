/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getBaseMappingsMock = vi.fn();

vi.doMock('../../core/build_active_mappings', async () => {
  const actual = (await vi.importActual('../../core/build_active_mappings'));
  return {
    ...actual,
    getBaseMappings: getBaseMappingsMock,
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
