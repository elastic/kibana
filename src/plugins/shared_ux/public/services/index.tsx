/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, createContext, useContext } from 'react';
import { SharedUXPlatformService } from './platform';
import { servicesFactory } from './stub';

/**
 * A collection of services utilized by SharedUX.  This serves as a thin
 * abstraction layer between services provided by Kibana and other plugins
 * while allowing this plugin to be developed independently of those contracts.
 *
 * It also allows us to "swap out" differenct implementations of these services
 * for different environments, (e.g. Jest, Storybook, etc.)
 */
export interface SharedUXServices {
  platform: SharedUXPlatformService;
}

// The React Context used to provide the services to the SharedUX components.
const ServicesContext = createContext<SharedUXServices>(servicesFactory());

/**
 * The `React.Context` Provider component for the `SharedUXServices` context.  Any
 * plugin or environemnt that consumes SharedUX components needs to wrap their React
 * tree with this provider.
 */
export const ServicesProvider: FC<SharedUXServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `SharedUXServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}

/**
 * React hook for accessing the pre-wired `SharedUXPlatformService`.
 */
export const usePlatformService = () => useServices().platform;
