/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsManagementPluginSetup,
  SavedObjectsManagementPluginStart,
} from './plugin';

const createSetupContractMock = (): jest.Mocked<SavedObjectsManagementPluginSetup> => {
  const mock = {};
  return mock;
};

const createStartContractMock = (): jest.Mocked<SavedObjectsManagementPluginStart> => {
  const mock = {
    getAllowedTypes: jest.fn(),
    getRelationships: jest.fn(),
    getSavedObjectLabel: jest.fn(),
    getDefaultTitle: jest.fn(),
    parseQuery: jest.fn(),
    getTagFindReferences: jest.fn(),
  };
  return mock;
};

export const savedObjectsManagementPluginMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
