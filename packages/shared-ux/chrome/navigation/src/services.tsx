/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo } from 'react';
import { NavigationKibanaDependencies, NavigationServices } from '../types';
import { CloudLinks, getCloudLinks } from './cloud_links';

const Context = React.createContext<NavigationServices | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NavigationProvider: FC<NavigationServices> = ({ children, ...services }) => {
  return <Context.Provider value={services}>{children}</Context.Provider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NavigationKibanaProvider: FC<NavigationKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { core, serverless, cloud } = dependencies;
  const { chrome, http } = core;
  const { basePath } = http;
  const { navigateToUrl } = core.application;

  const cloudLinks: CloudLinks = useMemo(() => (cloud ? getCloudLinks(cloud) : {}), [cloud]);

  const value: NavigationServices = {
    basePath,
    recentlyAccessed$: chrome.recentlyAccessed.get$(),
    navLinks$: chrome.navLinks.getNavLinks$(),
    navigateToUrl,
    navIsOpen: true,
    onProjectNavigationChange: serverless.setNavigation,
    activeNodes$: serverless.getActiveNavigationNodes$(),
    cloudLinks,
  };

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
