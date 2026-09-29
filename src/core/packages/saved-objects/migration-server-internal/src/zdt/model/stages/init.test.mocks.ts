/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getCurrentIndexMock = vi.fn();
export const checkVersionCompatibilityMock = vi.fn();
export const buildIndexMappingsMock = vi.fn();
export const generateAdditiveMappingDiffMock = vi.fn();
export const getAliasActionsMock = vi.fn();
export const checkIndexCurrentAlgorithmMock = vi.fn();

export const getCreationAliasesMock = vi.fn();

vi.doMock('../../utils', async () => {
  const realModule = await vi.importActual('../../utils');
  return {
    ...realModule,
    getCurrentIndex: getCurrentIndexMock,
    checkVersionCompatibility: checkVersionCompatibilityMock,
    buildIndexMappings: buildIndexMappingsMock,
    generateAdditiveMappingDiff: generateAdditiveMappingDiffMock,
    getAliasActions: getAliasActionsMock,
    checkIndexCurrentAlgorithm: checkIndexCurrentAlgorithmMock,
    getCreationAliases: getCreationAliasesMock,
  };
});

export const getAliasesMock = vi.fn();

vi.doMock('../../../model/helpers', async () => {
  const realModule = await vi.importActual('../../../model/helpers');
  return {
    ...realModule,
    getAliases: getAliasesMock,
  };
});
