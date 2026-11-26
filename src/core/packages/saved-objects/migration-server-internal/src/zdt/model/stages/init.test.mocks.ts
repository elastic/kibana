/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
export const getCurrentIndexMock: Mock = vi.fn();
export const checkVersionCompatibilityMock: Mock = vi.fn();
export const buildIndexMappingsMock: Mock = vi.fn();
export const generateAdditiveMappingDiffMock: Mock = vi.fn();
export const getAliasActionsMock: Mock = vi.fn();
export const checkIndexCurrentAlgorithmMock: Mock = vi.fn();

export const getCreationAliasesMock: Mock = vi.fn();

vi.doMock('../../utils', async () => {
  const realModule = await vi.importActual('../../utils');
  const mockedModule = {
    ...realModule,
    getCurrentIndex: getCurrentIndexMock,
    checkVersionCompatibility: checkVersionCompatibilityMock,
    buildIndexMappings: buildIndexMappingsMock,
    generateAdditiveMappingDiff: generateAdditiveMappingDiffMock,
    getAliasActions: getAliasActionsMock,
    checkIndexCurrentAlgorithm: checkIndexCurrentAlgorithmMock,
    getCreationAliases: getCreationAliasesMock,
  };
  return { ...mockedModule, default: mockedModule };
});

export const getAliasesMock: Mock = vi.fn();

vi.doMock('../../../model/helpers', async () => {
  const realModule = await vi.importActual('../../../model/helpers');
  const mockedModule = {
    ...realModule,
    getAliases: getAliasesMock,
  };
  return { ...mockedModule, default: mockedModule };
});
