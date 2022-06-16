/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, createContext, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { NoDataCardProvider } from '@kbn/shared-ux-card-no-data';
import type { SharedUxServices } from './types';

// The React Context used to provide the services to the SharedUX components.
const SharedUxServicesContext = createContext<SharedUxServices | null>(null);

/**
 * The `React.Context` Provider component for the `SharedUxServices` context.  Any
 * plugin or environment that consumes SharedUX components needs to wrap their React
 * tree with this provider.
 *
 * Within a plugin, you can use use the Shared UX plugin and retrieve a fully-configured
 * context from the `start` contract.
 */
export const SharedUxServicesProvider: FC<SharedUxServices> = ({ children, ...services }) => {
  // TODO: clintandrewhall - including the `NoDataCardProvider` here is a temporary solution
  // to consumers using this context to populate the NoDataPage.  This will likely be removed soon,
  // when NoDataPage is moved to its own package.
  const currentAppId = useObservable(services.application.currentAppId$);
  const noDataCardServices = {
    currentAppId,
    addBasePath: services.http.addBasePath,
    canAccessFleet: services.permissions.canAccessFleet,
    navigateToUrl: services.application.navigateToUrl,
  };

  return (
    <SharedUxServicesContext.Provider value={services}>
      <NoDataCardProvider {...noDataCardServices}>{children}</NoDataCardProvider>
    </SharedUxServicesContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired `SharedUxServices`.
 */
export function useSharedUxServices() {
  const context = useContext(SharedUxServicesContext);

  if (!context) {
    throw new Error(
      'SharedUxServicesContext missing.  Ensure your component or React root is wrapped with SharedUxServicesProvider.'
    );
  }

  return context;
}

/**
 * React hook for accessing the pre-wired `SharedUxPlatformService`.
 */
export const usePlatformService = () => useSharedUxServices().platform;

/**
 * React hook for accessing the pre-wired `SharedUxPermissionsService`.
 */
export const usePermissions = () => useSharedUxServices().permissions;

/**
 * React hook for accessing the pre-wired `SharedUxEditorsService`.
 */
export const useEditors = () => useSharedUxServices().editors;

/**
 * React hook for accessing the pre-wired `SharedUxDocLinksService`.
 */
export const useDocLinks = () => useSharedUxServices().docLinks;

export const useHttp = () => useSharedUxServices().http;

export const useApplication = () => useSharedUxServices().application;

/**
 * React hook for accessing the pre-wired `SharedUxDataService`.
 */
export const useData = () => useSharedUxServices().data;
