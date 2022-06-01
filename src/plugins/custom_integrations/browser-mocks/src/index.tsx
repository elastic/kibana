/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  CustomIntegrationsSetup,
  CustomIntegrationsStart,
} from '@kbn/custom-integration-plugin-browser';
import { CustomIntegrationsServicesProvider } from '@kbn/custom-integration-service-layer';
import { servicesFactory } from './services';

function createCustomIntegrationsSetup(): jest.Mocked<CustomIntegrationsSetup> {
  const mock: jest.Mocked<CustomIntegrationsSetup> = {
    getAppendCustomIntegrations: jest.fn(),
    getReplacementCustomIntegrations: jest.fn(),
  };
  return mock;
}

function createCustomIntegrationsStart(): jest.Mocked<CustomIntegrationsStart> {
  const services = servicesFactory({ startPlugins: {}, coreStart: coreMock.createStart() });

  return {
    ContextProvider: jest.fn(({ children }) => (
      <CustomIntegrationsServicesProvider {...services}>
        {children}
      </CustomIntegrationsServicesProvider>
    )),
  };
}

export const customIntegrationsMock = {
  createSetup: createCustomIntegrationsSetup,
  createStart: createCustomIntegrationsStart,
};
