/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
  RedirectAppLinksProvider,
  RedirectAppLinksKibanaProvider,
} from '@kbn/shared-ux-link-redirect-app';

/**
 * A list of services that are consumed by this component.
 */
interface Services {
  addBasePath: (path: string) => string;
  canAccessFleet: boolean;
}

const Context = React.createContext<Services | null>(null);

/**
 * Services that are consumed by this component and its dependencies.
 */
export type NoDataCardServices = Services & RedirectAppLinksServices;

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NoDataCardProvider: FC<NoDataCardServices> = ({ children, ...services }) => {
  const { addBasePath, canAccessFleet } = services;

  return (
    <Context.Provider value={{ addBasePath, canAccessFleet }}>
      <RedirectAppLinksProvider {...services}>{children}</RedirectAppLinksProvider>
    </Context.Provider>
  );
};

interface KibanaDependencies {
  coreStart: {
    http: {
      basePath: {
        prepend: (path: string) => string;
      };
    };
    application: {
      capabilities: {
        navLinks: Record<string, boolean>;
      };
    };
  };
}
/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component as well as its dependencies.
 */
export type NoDataCardKibanaDependencies = KibanaDependencies & RedirectAppLinksKibanaDependencies;

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
