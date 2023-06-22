/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { Services, KibanaDependencies } from './types';

const Context = React.createContext<Services | null>(null);

/**
 * Kibana-specific provider that wraps the app in the necessary context providers for redirection.
 */
export const CardsNavigationKibanaProvider: FC<KibanaDependencies> = ({ children, coreStart }) => {
  return (
    <RedirectAppLinks coreStart={coreStart}>
      <Context.Provider value={{}}>{children}</Context.Provider>;
    </RedirectAppLinks>
  );
};

export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'CardsNavigationContext is missing.  Ensure your component or React root is wrapped with CardsNavigationContext.'
    );
  }

  return context;
}
