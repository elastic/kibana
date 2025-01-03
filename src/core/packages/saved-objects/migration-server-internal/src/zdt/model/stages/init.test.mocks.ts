/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getCurrentIndexMock = jest.fn();
export const checkVersionCompatibilityMock = jest.fn();
export const buildIndexMappingsMock = jest.fn();
export const generateAdditiveMappingDiffMock = jest.fn();
export const getAliasActionsMock = jest.fn();
export const checkIndexCurrentAlgorithmMock = jest.fn();

export const getCreationAliasesMock = jest.fn();

jest.doMock('../../utils', () => {
  const realModule = jest.requireActual('../../utils');
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

export const getAliasesMock = jest.fn();

jest.doMock('../../../model/helpers', () => {
  const realModule = jest.requireActual('../../../model/helpers');
  return {
    ...realModule,
    getAliases: getAliasesMock,
  };
});
