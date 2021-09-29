/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';

import { CustomIntegrationsPluginSetup } from '../server';

function createCustomIntegrationsSetup(): MockedKeys<CustomIntegrationsPluginSetup> {
  const mock = {
    registerCustomIntegration: jest.fn(),
    getAppendCustomIntegrations: jest.fn(),
  };

  return mock as MockedKeys<CustomIntegrationsPluginSetup>;
}

export const customIntegrationsMock = {
  createSetup: createCustomIntegrationsSetup,
};
