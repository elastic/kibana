/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getCoreTransformsMock = vi.fn();
export const getReferenceTransformsMock = vi.fn();
export const getConversionTransformsMock = vi.fn();

vi.doMock('./internal_transforms', () => {
      const mocked = {
      getCoreTransforms: getCoreTransformsMock,
      getReferenceTransforms: getReferenceTransformsMock,
      getConversionTransforms: getConversionTransformsMock,
    };
      return { ...mocked, default: mocked };
    });

export const getModelVersionTransformsMock = vi.fn();
export const getModelVersionSchemasMock = vi.fn();

vi.doMock('./model_version', () => {
      const mocked = {
      getModelVersionTransforms: getModelVersionTransformsMock,
      getModelVersionSchemas: getModelVersionSchemasMock,
    };
      return { ...mocked, default: mocked };
    });

export const validateTypeMigrationsMock = vi.fn();

vi.doMock('./validate_migrations', () => {
      const mocked = {
      validateTypeMigrations: validateTypeMigrationsMock,
    };
      return { ...mocked, default: mocked };
    });

export const resetAllMocks = () => {
  getCoreTransformsMock.mockReset().mockReturnValue([]);
  getReferenceTransformsMock.mockReset().mockReturnValue([]);
  getConversionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionTransformsMock.mockReset().mockReturnValue([]);
  getModelVersionSchemasMock.mockReset().mockReturnValue({});
  validateTypeMigrationsMock.mockReset();
};
