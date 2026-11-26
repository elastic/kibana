/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
export const getCoreTransformsMock: Mock = vi.fn();
export const getReferenceTransformsMock: Mock = vi.fn();
export const getConversionTransformsMock: Mock = vi.fn();

vi.doMock('./internal_transforms', () => {
  const mockedModule = {
    getCoreTransforms: getCoreTransformsMock,
    getReferenceTransforms: getReferenceTransformsMock,
    getConversionTransforms: getConversionTransformsMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const getModelVersionTransformsMock: Mock = vi.fn();
export const getModelVersionSchemasMock: Mock = vi.fn();

vi.doMock('./model_version', () => {
  const mockedModule = {
    getModelVersionTransforms: getModelVersionTransformsMock,
    getModelVersionSchemas: getModelVersionSchemasMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const validateTypeMigrationsMock: Mock = vi.fn();

vi.doMock('./validate_migrations', () => {
  const mockedModule = {
    validateTypeMigrations: validateTypeMigrationsMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const resetAllMocks = () => {
  getCoreTransformsMock.mockReset().mockReturnValue([]);
  getReferenceTransformsMock.mockReset().mockReturnValue([]);
  getConversionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionSchemasMock.mockReset().mockReturnValue({});
  validateTypeMigrationsMock.mockReset();
};
