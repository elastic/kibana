/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
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
export const AnalyticsNoDataPageProvider: FC<AnalyticsNoDataPageServices> = ({
  children,
  ...services
}) => {
  const { kibanaGuideDocLink, customBranding } = services;

  return (
    <Context.Provider value={{ kibanaGuideDocLink, customBranding }}>
      <KibanaNoDataPageProvider {...services}>{children}</KibanaNoDataPageProvider>
    </Context.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const AnalyticsNoDataPageKibanaProvider: FC<AnalyticsNoDataPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const value: Services = {
    kibanaGuideDocLink: dependencies.coreStart.docLinks.links.kibana.guide,
    customBranding: {
      showPlainSpinner: dependencies.customBranding.showPlainSpinner,
      hasCustomBranding$: dependencies.customBranding.hasCustomBranding$,
    },
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
