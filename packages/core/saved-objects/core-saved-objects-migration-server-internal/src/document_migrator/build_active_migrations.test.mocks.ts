/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getCoreTransformsMock = jest.fn();
export const getReferenceTransformsMock = jest.fn();
export const getConversionTransformsMock = jest.fn();

jest.doMock('./internal_transforms', () => ({
  getCoreTransforms: getCoreTransformsMock,
  getReferenceTransforms: getReferenceTransformsMock,
  getConversionTransforms: getConversionTransformsMock,
}));

export const getModelVersionTransformsMock = jest.fn();
export const getModelVersionSchemasMock = jest.fn();

jest.doMock('./model_version', () => ({
  getModelVersionTransforms: getModelVersionTransformsMock,
  getModelVersionSchemas: getModelVersionSchemasMock,
}));

export const validateTypeMigrationsMock = jest.fn();

jest.doMock('./validate_migrations', () => ({
  validateTypeMigrations: validateTypeMigrationsMock,
}));

export const resetAllMocks = () => {
  getCoreTransformsMock.mockReset().mockReturnValue([]);
  getReferenceTransformsMock.mockReset().mockReturnValue([]);
  getConversionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionSchemasMock.mockReset().mockReturnValue({});
  validateTypeMigrationsMock.mockReset();
};
