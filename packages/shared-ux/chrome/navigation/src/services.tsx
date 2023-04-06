/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { NavigationKibanaDependencies, NavigationServices } from '../types';

const Context = React.createContext<NavigationServices | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NavigationProvider: FC<NavigationServices> = ({ children, ...services }) => {
  const { getLocator, recentItems, navIsOpen, setActiveNavItemId } = services;
  return (
    <Context.Provider value={{ getLocator, recentItems, navIsOpen, setActiveNavItemId }}>
      {children}
    </Context.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NavigationKibanaProvider: FC<NavigationKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  // FIXME
  // const recentItems$ = dependencies.core.chrome.recentlyAccessed.get$();
  // const recentItems = useObservable(recentItems$, []);
  const recentItems = [{ label: 'This is a test', id: 'test', link: 'legendOfZelda' }];

  const getLocator = (id: string) => dependencies.share.url.locators.get(id);
  const navIsOpen = useObservable(dependencies.core.chrome.getProjectNavIsOpen$(), true);

  const setActiveNavItemId = (id: string | number) => {
    console.log({ newActiveItemId: id });
  };

  const value: NavigationServices = {
    navIsOpen,
    recentItems,
    getLocator,
    setActiveNavItemId,
  };

  return (
    <Context.Provider {...{ value }} {...dependencies}>
      {children}
    </Context.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useNavigation() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'Navigation Context is missing. Ensure your component or React root is wrapped with NavigationContext.'
    );
  }

  return context;
}
