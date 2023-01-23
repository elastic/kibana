/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import {
  RedirectAppLinksProvider,
  RedirectAppLinksKibanaProvider,
} from '@kbn/shared-ux-link-redirect-app';

import type {
  Services,
  NoDataCardServices,
  NoDataCardKibanaDependencies,
} from '@kbn/shared-ux-card-no-data-types';

const Context = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NoDataCardProvider: FC<NoDataCardServices> = ({ children, ...services }) => {
  const { addBasePath, canAccessFleet, customBranding } = services;

  return (
    <Context.Provider value={{ addBasePath, canAccessFleet, customBranding }}>
      <RedirectAppLinksProvider {...services}>{children}</RedirectAppLinksProvider>
    </Context.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NoDataCardKibanaProvider: FC<NoDataCardKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const value: Services = {
    addBasePath: dependencies.coreStart.http.basePath.prepend,
    canAccessFleet: dependencies.coreStart.application.capabilities.navLinks.integrations,
    customBranding: { hasCustomBranding: dependencies.coreStart.customBranding.hasCustomBranding },
  };

  return (
    <Context.Provider {...{ value }}>
      <RedirectAppLinksKibanaProvider {...dependencies}>{children}</RedirectAppLinksKibanaProvider>
    </Context.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'NoDataCard Context is missing.  Ensure your component or React root is wrapped with NoDataCardContext.'
    );
  }

  return context;
}
