/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pluginServices } from './services';
import { PluginServiceRegistry } from './services/create';
import { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';
import { CustomIntegrationsServices } from './services';
import { providers } from './services/stub';

function createCustomIntegrationsSetup(): jest.Mocked<CustomIntegrationsSetup> {
  const mock: jest.Mocked<CustomIntegrationsSetup> = {
    getAppendCustomIntegrations: jest.fn(),
    getReplacementCustomIntegrations: jest.fn(),
  };
  return mock;
}

function createCustomIntegrationsStart(): jest.Mocked<CustomIntegrationsStart> {
  const registry = new PluginServiceRegistry<CustomIntegrationsServices>(providers);
  pluginServices.setRegistry(registry.start({}));
  const ContextProvider = pluginServices.getContextProvider();

  return {
    ContextProvider: jest.fn(ContextProvider),
  };
}

export const customIntegrationsMock = {
  createSetup: createCustomIntegrationsSetup,
  createStart: createCustomIntegrationsStart,
};
