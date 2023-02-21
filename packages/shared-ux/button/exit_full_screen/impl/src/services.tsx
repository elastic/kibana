/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

import type {
  Services,
  ExitFullScreenButtonServices,
  ExitFullScreenButtonKibanaDependencies,
} from '@kbn/shared-ux-button-exit-full-screen-types';

const ExitFullScreenButtonContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const ExitFullScreenButtonProvider: FC<ExitFullScreenButtonServices> = ({
  children,
  ...services
}) => {
  return (
    <ExitFullScreenButtonContext.Provider value={services}>
      {children}
    </ExitFullScreenButtonContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const ExitFullScreenButtonKibanaProvider: FC<ExitFullScreenButtonKibanaDependencies> = ({
  children,
  ...services
}) => {
  return (
    <ExitFullScreenButtonContext.Provider
      value={{
        setIsFullscreen: (isFullscreen: boolean) => {
          services.coreStart.chrome.setIsVisible(!isFullscreen);
        },
        customBranding$: services.coreStart.customBranding.customBranding$,
      }}
    >
      {children}
    </ExitFullScreenButtonContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(ExitFullScreenButtonContext);

  if (!context) {
    throw new Error(
      'ExitFullScreenButtonContext is missing.  Ensure your component or React root is wrapped with ExitFullScreenButtonProvider.'
    );
  }

  return context;
}
