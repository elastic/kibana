/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useContext } from 'react';
import { CustomIntegrationsFindService } from './find';
import { CustomIntegrationsPlatformService } from './platform';

/**
 * Services used by the custom_integrations plugin.
 */
export interface CustomIntegrationsServices {
  find: CustomIntegrationsFindService;
  platform: CustomIntegrationsPlatformService;
}

// The React Context used to provide the services to the CustomIntegrations components.
const CustomIntegrationsServicesContext = createContext<CustomIntegrationsServices | null>(null);

/**
 * The `React.Context` Provider component for the `CustomIntegrationsServices` context.  Any
 * plugin or environment that consumes CustomIntegrationsServices components needs to wrap their React
 * tree with this provider.
 *
 * Within a plugin, you can  use the CustomIntegrations plugin and retrieve a fully-configured
 * context from the `start` contract.
 */
export const CustomIntegrationsServicesProvider: FC<CustomIntegrationsServices> = ({
  children,
  ...services
}) => (
  <CustomIntegrationsServicesContext.Provider value={services}>
    {children}
  </CustomIntegrationsServicesContext.Provider>
);

/**
 * React hook for accessing pre-wired `SharedUxServices`.
 */
export function useCustomIntegrationsServices() {
  const context = useContext(CustomIntegrationsServicesContext);

  if (!context) {
    throw new Error(
      'CustomIntegrationsServicesContext missing.  Ensure your component or React root is wrapped with CustomIntegrationsServicesProvider.'
    );
  }

  return context;
}

/**
 * A React hook that provides connections to the `CustomIntegrationsFindService`.
 */
export const useFindService = () => useCustomIntegrationsServices().find;

/**
 * A React hook that provides connections to the `CustomIntegrationsPlatformService`.
 */
export const usePlatformService = () => useCustomIntegrationsServices().platform;
