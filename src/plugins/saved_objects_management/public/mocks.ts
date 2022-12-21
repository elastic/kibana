/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { actionServiceMock } from './services/action_service.mock';
import { columnServiceMock } from './services/column_service.mock';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './plugin';

const createSetupContractMock = (): jest.Mocked<SavedObjectsManagementPluginSetup> => {
  const mock = {
    actions: actionServiceMock.createSetup(),
    columns: columnServiceMock.createSetup(),
  };
  return mock;
};

const createStartContractMock = (): jest.Mocked<SavedObjectsManagementPluginStart> => {
  const mock = {
    actions: actionServiceMock.createStart(),
    columns: columnServiceMock.createStart(),
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
