/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getReferenceTransformsMock = jest.fn();
export const getConversionTransformsMock = jest.fn();

jest.doMock('./internal_transforms', () => ({
  getReferenceTransforms: getReferenceTransformsMock,
  getConversionTransforms: getConversionTransformsMock,
}));

export const getModelVersionTransformsMock = jest.fn();

jest.doMock('./model_version', () => ({
  getModelVersionTransforms: getModelVersionTransformsMock,
}));

export const validateTypeMigrationsMock = jest.fn();

jest.doMock('./validate_migrations', () => ({
  validateTypeMigrations: validateTypeMigrationsMock,
}));

export const resetAllMocks = () => {
  getReferenceTransformsMock.mockReset().mockReturnValue([]);
  getConversionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionTransformsMock.mockReset().mockReturnValue([]);
  validateTypeMigrationsMock.mockReset();
};
