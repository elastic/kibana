/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import {
  NoDataViewsPromptProvider,
  NoDataViewsPromptKibanaProvider,
} from '@kbn/shared-ux-prompt-no-data-views';

import { NoDataCardProvider, NoDataCardKibanaProvider } from '@kbn/shared-ux-card-no-data';

import {
  Services,
  KibanaNoDataPageServices,
  KibanaNoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-no-data-types';

const KibanaNoDataPageContext = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component.
 */
export const KibanaNoDataPageProvider: FC<KibanaNoDataPageServices> = ({
  children,
  ...services
}) => {
  const { hasESData, hasUserDataView } = services;

  return (
    <KibanaNoDataPageContext.Provider value={{ hasESData, hasUserDataView }}>
      <NoDataViewsPromptProvider {...services}>
        <NoDataCardProvider {...services}>{children}</NoDataCardProvider>
      </NoDataViewsPromptProvider>
    </KibanaNoDataPageContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const KibanaNoDataPageKibanaProvider: FC<KibanaNoDataPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { dataViews } = dependencies;
  const value: Services = {
    hasESData: dataViews.hasData.hasESData,
    hasUserDataView: dataViews.hasData.hasUserDataView,
  };

  return (
    <KibanaNoDataPageContext.Provider value={value}>
      <NoDataViewsPromptKibanaProvider {...dependencies}>
        <NoDataCardKibanaProvider {...dependencies}>{children}</NoDataCardKibanaProvider>
      </NoDataViewsPromptKibanaProvider>
    </KibanaNoDataPageContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(KibanaNoDataPageContext);

  if (!context) {
    throw new Error(
      'KibanaNoDataPageContext is missing.  Ensure your component or React root is wrapped with KibanaNoDataPageContext.'
    );
  }

  return context;
}
