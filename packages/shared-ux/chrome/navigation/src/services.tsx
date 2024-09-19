/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EventTracker } from './analytics';

import { NavigationKibanaDependencies, NavigationServices } from './types';

const Context = React.createContext<NavigationServices | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NavigationProvider: FC<PropsWithChildren<NavigationServices>> = ({
  children,
  ...services
}) => {
  return <Context.Provider value={services}>{children}</Context.Provider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NavigationKibanaProvider: FC<PropsWithChildren<NavigationKibanaDependencies>> = ({
  children,
  ...dependencies
}) => {
  const { core, activeNodes$ } = dependencies;
  const { chrome, http, analytics } = core;
  const { basePath } = http;
  const { navigateToUrl } = core.application;
  const isSideNavCollapsed = useObservable(chrome.sideNav.getIsCollapsed$(), true);
  const selectedPanelNode = useObservable(chrome.sideNav.getPanelSelectedNode$(), null);

  const value: NavigationServices = useMemo(
    () => ({
      basePath,
      recentlyAccessed$: chrome.recentlyAccessed.get$(),
      navigateToUrl,
      navIsOpen: true,
      activeNodes$,
      isSideNavCollapsed,
      eventTracker: new EventTracker({ reportEvent: analytics.reportEvent }),
      selectedPanelNode,
      setSelectedPanelNode: chrome.sideNav.setPanelSelectedNode,
    }),
    [
      activeNodes$,
      analytics.reportEvent,
      basePath,
      chrome.recentlyAccessed,
      isSideNavCollapsed,
      navigateToUrl,
      selectedPanelNode,
      chrome.sideNav.setPanelSelectedNode,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
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
