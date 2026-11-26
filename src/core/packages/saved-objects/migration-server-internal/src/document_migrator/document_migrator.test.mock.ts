/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
export const mockGetConvertedObjectId: Mock = vi.fn().mockReturnValue('uuidv5');

vi.mock('@kbn/core-saved-objects-utils-server', async () => {
  const actual = await vi.importActual<typeof import('@kbn/core-saved-objects-utils-server')>(
    '@kbn/core-saved-objects-utils-server'
  );
  const mockedModule = {
    ...actual,
    SavedObjectsUtils: {
      ...actual.SavedObjectsUtils,
      getConvertedObjectId: mockGetConvertedObjectId,
    },
  };
  return { ...mockedModule, default: mockedModule };
});

export const validateTypeMigrationsMock: Mock = vi.fn();

vi.doMock('./validate_migrations', async () => {
  const actual = await vi.importActual('./validate_migrations');
  const mockedModule = {
    ...actual,
    validateTypeMigrations: validateTypeMigrationsMock,
  };
  return { ...mockedModule, default: mockedModule };
});
