/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { NavigateToUrl } from './types';

/**
 * Contextual services for this component.
 */
export interface Services {
  navigateToUrl: NavigateToUrl;
  currentAppId?: string;
}

const RedirectAppLinksContext = React.createContext<Services | null>(null);

/**
 * Contextual services Provider.
 */
export const RedirectAppLinksProvider: FC<Services> = ({ children, ...services }) => {
  const { navigateToUrl, currentAppId } = services;
  return (
    <RedirectAppLinksContext.Provider value={{ navigateToUrl, currentAppId }}>
      {children}
    </RedirectAppLinksContext.Provider>
  );
};

/**
 * Kibana-specific contextual services to be adapted for this component.
 */
export interface KibanaDependencies {
  coreStart: {
    application: {
      currentAppId$: Observable<string | undefined>;
      navigateToUrl: NavigateToUrl;
    };
  };
}

/**
 * Kibana-specific contextual services Provider.
 */
export const RedirectAppLinksKibanaProvider: FC<KibanaDependencies> = ({ children, coreStart }) => {
  const { navigateToUrl, currentAppId$ } = coreStart.application;
  const currentAppId = useObservable(currentAppId$, undefined);

  return (
    <RedirectAppLinksContext.Provider
      value={{
        navigateToUrl,
        currentAppId,
      }}
    >
      {children}
    </RedirectAppLinksContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(RedirectAppLinksContext);

  if (!context) {
    throw new Error(
      'RedirectAppLinksContext is missing.  Ensure your component or React root is wrapped with RedirectAppLinksProvider.'
    );
  }

  return context;
}
