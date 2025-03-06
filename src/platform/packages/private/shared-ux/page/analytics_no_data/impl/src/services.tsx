/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext } from 'react';
import {
  KibanaNoDataPageKibanaProvider,
  KibanaNoDataPageProvider,
} from '@kbn/shared-ux-page-kibana-no-data';

import {
  Services,
  AnalyticsNoDataPageServices,
  AnalyticsNoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-analytics-no-data-types';

const Context = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const AnalyticsNoDataPageProvider: FC<PropsWithChildren<AnalyticsNoDataPageServices>> = ({
  children,
  ...services
}) => {
  const { kibanaGuideDocLink, customBranding, getHttp, prependBasePath, pageFlavor } = services;

  return (
    <Context.Provider
      value={{ kibanaGuideDocLink, customBranding, getHttp, prependBasePath, pageFlavor }}
    >
      <KibanaNoDataPageProvider {...services}>{children}</KibanaNoDataPageProvider>
    </Context.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const AnalyticsNoDataPageKibanaProvider: FC<
  PropsWithChildren<AnalyticsNoDataPageKibanaDependencies>
> = ({ children, ...dependencies }) => {
  const value: Services = {
    kibanaGuideDocLink: dependencies.coreStart.docLinks.links.kibana.guide,
    customBranding: {
      hasCustomBranding$: dependencies.coreStart.customBranding.hasCustomBranding$,
    },
    getHttp: dependencies.coreStart.http.get,
    prependBasePath: dependencies.coreStart.http.basePath.prepend,
    pageFlavor: dependencies.noDataPage?.getAnalyticsNoDataPageFlavor() ?? 'kibana',
  };
  return (
    <Context.Provider {...{ value }}>
      <KibanaNoDataPageKibanaProvider {...dependencies}>{children}</KibanaNoDataPageKibanaProvider>
    </Context.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'AnalyticsNoDataPage Context is missing.  Ensure your component or React root is wrapped with AnalyticsNoDataPageContext.'
    );
  }

  return context;
}
