/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import { NavigationKibanaDependencies, NavigationServices, NavItemProps } from '../types';
import { GetLocatorFn, LocatorNavigationFn, SetActiveNavItemIdFn } from '../types/internal';

const Context = React.createContext<NavigationServices | null>(null);

export const getLocatorNavigation = (
  getLocator: GetLocatorFn,
  setActiveNavItemId: SetActiveNavItemIdFn
): LocatorNavigationFn => {
  const locatorNavigation = (item: NavItemProps | undefined) => () => {
    if (item) {
      const { locator, id } = item;
      setActiveNavItemId(id as string); // FIXME handle if navigation action fails
      if (locator) {
        const locatorInstance = getLocator(locator.id);

        if (!locatorInstance) {
          throw new Error(`Unresolved Locator instance for ${locator.id}`);
        }

        locatorInstance.navigateSync(locator.params ?? {});
      }
    }
  };
  return locatorNavigation;
};

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NavigationProvider: FC<NavigationServices> = ({ children, ...services }) => {
  const { recentItems, navIsOpen, locatorNavigation, activeNavItemId$ } = services;
  return (
    <Context.Provider value={{ recentItems, navIsOpen, locatorNavigation, activeNavItemId$ }}>
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

  const activeNavItemId$ = new BehaviorSubject<string>('');
  const setActiveNavItemId = (id: string) => {
    activeNavItemId$.next(id);
  };

  const locatorNavigation = getLocatorNavigation(getLocator, setActiveNavItemId);

  const value: NavigationServices = {
    locatorNavigation,
    navIsOpen,
    recentItems,
    activeNavItemId$,
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
