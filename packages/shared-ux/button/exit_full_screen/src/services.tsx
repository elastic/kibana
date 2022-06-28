/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

/**
 * Abstract external services for this component.
 */
export interface Services {
  setIsFullscreen: (isFullscreen: boolean) => void;
}

const ExitFullScreenButtonContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const ExitFullScreenButtonProvider: FC<Services> = ({ children, ...services }) => {
  return (
    <ExitFullScreenButtonContext.Provider value={services}>
      {children}
    </ExitFullScreenButtonContext.Provider>
  );
};

/**
 * Kibana-specific service types.
 */
export interface KibanaServices {
  coreStart: {
    chrome: {
      setIsVisible: (isVisible: boolean) => void;
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const ExitFullScreenButtonKibanaProvider: FC<KibanaServices> = ({
  children,
  ...services
}) => {
  return (
    <ExitFullScreenButtonContext.Provider
      value={{
        setIsFullscreen: services.coreStart.chrome.setIsVisible,
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
