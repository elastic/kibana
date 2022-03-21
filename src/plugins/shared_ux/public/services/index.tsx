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
import { SharedUXUserPermissionsService } from './permissions';
import { SharedUXEditorsService } from './editors';
import { SharedUXDocLinksService } from './doc_links';
import { SharedUXHttpService } from './http';
import { SharedUXApplicationService } from './application';

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
  permissions: SharedUXUserPermissionsService;
  editors: SharedUXEditorsService;
  docLinks: SharedUXDocLinksService;
  http: SharedUXHttpService;
  application: SharedUXApplicationService;
}

// The React Context used to provide the services to the SharedUX components.
const ServicesContext = createContext<SharedUXServices>(servicesFactory());

/**
 * The `React.Context` Provider component for the `SharedUXServices` context.  Any
 * plugin or environment that consumes SharedUX components needs to wrap their React
 * tree with this provider.
 *
 * Within a plugin, you can use the `ServicesContext` provided by the SharedUX plugin start
 * lifeycle method.
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

export const usePermissions = () => useServices().permissions;

export const useEditors = () => useServices().editors;

export const useDocLinks = () => useServices().docLinks;

export const useHttp = () => useServices().http;

export const useApplication = () => useServices().application;
