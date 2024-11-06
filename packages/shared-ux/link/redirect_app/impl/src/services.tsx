/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
} from '@kbn/shared-ux-link-redirect-app-types';

const RedirectAppLinksContext = React.createContext<RedirectAppLinksServices | null>(null);

/**
 * Contextual services Provider.
 */
export const RedirectAppLinksProvider: FC<PropsWithChildren<RedirectAppLinksServices>> = ({
  children,
  ...services
}) => {
  const { navigateToUrl, currentAppId } = services;
  return (
    <RedirectAppLinksContext.Provider value={{ navigateToUrl, currentAppId }}>
      {children}
    </RedirectAppLinksContext.Provider>
  );
};

/**
 * Kibana-specific contextual services Provider.
 */
export const RedirectAppLinksKibanaProvider: FC<
  PropsWithChildren<RedirectAppLinksKibanaDependencies>
> = ({ children, coreStart }) => {
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
