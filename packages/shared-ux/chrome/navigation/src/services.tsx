/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { NavigationKibanaDependencies, NavigationServices } from '../types';
import { CloudLink, CloudLinks, getCloudLinks } from './cloud_links';

const Context = React.createContext<NavigationServices | null>(null);

const stripTrailingForwardSlash = (str: string) => {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
};

const parseCloudURLs = (cloudLinks: CloudLinks): CloudLinks => {
  const { userAndRoles, billingAndSub, deployment, performance } = cloudLinks;

  // We remove potential trailing forward slash ("/") at the end of the URL
  // because it breaks future navigation in Cloud console once we navigate there.
  const parseLink = (link?: CloudLink): CloudLink | undefined => {
    if (!link) return undefined;
    return { ...link, href: stripTrailingForwardSlash(link.href) };
  };

  return {
    ...cloudLinks,
    userAndRoles: parseLink(userAndRoles),
    billingAndSub: parseLink(billingAndSub),
    deployment: parseLink(deployment),
    performance: parseLink(performance),
  };
};

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NavigationProvider: FC<NavigationServices> = ({ children, ...services }) => {
  const servicesParsed = useMemo<NavigationServices>(() => {
    return {
      ...services,
      cloudLinks: parseCloudURLs(services.cloudLinks),
    };
  }, [services]);

  return <Context.Provider value={servicesParsed}>{children}</Context.Provider>;
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

  const cloudLinks: CloudLinks = useMemo(
    () => (cloud ? parseCloudURLs(getCloudLinks(cloud)) : {}),
    [cloud]
  );
  const isSideNavCollapsed = useObservable(chrome.getIsSideNavCollapsed$(), true);

  const value: NavigationServices = {
    basePath,
    recentlyAccessed$: chrome.recentlyAccessed.get$(),
    navLinks$: chrome.navLinks.getNavLinks$(),
    navigateToUrl,
    navIsOpen: true,
    onProjectNavigationChange: serverless.setNavigation,
    activeNodes$: serverless.getActiveNavigationNodes$(),
    cloudLinks,
    isSideNavCollapsed,
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
