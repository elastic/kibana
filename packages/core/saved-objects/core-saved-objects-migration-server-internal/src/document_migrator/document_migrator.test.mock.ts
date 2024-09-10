/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockGetConvertedObjectId = jest.fn().mockReturnValue('uuidv5');

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      ...actual.SavedObjectsUtils,
      getConvertedObjectId: mockGetConvertedObjectId,
    },
  };
});

export const validateTypeMigrationsMock = jest.fn();

jest.doMock('./validate_migrations', () => {
  const actual = jest.requireActual('./validate_migrations');
  return {
    ...actual,
    validateTypeMigrations: validateTypeMigrationsMock,
  };
});
