/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { actionServiceMock } from './services/action_service.mock';
import { columnServiceMock } from './services/column_service.mock';
import { serviceRegistryMock } from './services/service_registry.mock';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './plugin';

const createSetupContractMock = (): jest.Mocked<SavedObjectsManagementPluginSetup> => {
  const mock = {
    actions: actionServiceMock.createSetup(),
    columns: columnServiceMock.createSetup(),
    serviceRegistry: serviceRegistryMock.create(),
  };
  return mock;
};

const createStartContractMock = (): jest.Mocked<SavedObjectsManagementPluginStart> => {
  const mock = {
    actions: actionServiceMock.createStart(),
    columns: columnServiceMock.createStart(),
  };
  return mock;
};

export const savedObjectsManagementPluginMock = {
  createServiceRegistry: serviceRegistryMock.create,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
