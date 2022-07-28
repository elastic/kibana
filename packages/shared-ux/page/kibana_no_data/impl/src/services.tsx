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
  KibanaNoDataPageServices,
  KibanaNoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-no-data-types';

import { LegacyServicesProvider, getLegacyServices } from './legacy_services';

const KibanaNoDataPageContext = React.createContext<KibanaNoDataPageServices | null>(null);

/**
 * A Context Provider that provides services to the component.
 */
export const KibanaNoDataPageProvider: FC<KibanaNoDataPageServices> = ({
  children,
  ...services
}) => (
  <KibanaNoDataPageContext.Provider value={services}>
    <NoDataViewsPromptProvider {...services}>
      <NoDataCardProvider {...services}>
        <LegacyServicesProvider {...getLegacyServices(services)}>{children}</LegacyServicesProvider>
      </NoDataCardProvider>
    </NoDataViewsPromptProvider>
  </KibanaNoDataPageContext.Provider>
);

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const KibanaNoDataPageKibanaProvider: FC<KibanaNoDataPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { coreStart, dataViewEditor, dataViews } = dependencies;
  const value: KibanaNoDataPageServices = {
    addBasePath: coreStart.http.basePath.prepend,
    canAccessFleet: coreStart.application.capabilities.navLinks.integrations,
    canCreateNewDataView: dataViewEditor.userPermissions.editDataView(),
    currentAppId$: coreStart.application.currentAppId$,
    dataViewsDocLink: coreStart.docLinks.links.indexPatterns?.introduction,
    hasDataView: dataViews.hasData.hasDataView,
    hasESData: dataViews.hasData.hasESData,
    hasUserDataView: dataViews.hasData.hasUserDataView,
    navigateToUrl: coreStart.application.navigateToUrl,
    openDataViewEditor: dataViewEditor.openEditor,
    setIsFullscreen: (isVisible: boolean) => coreStart.chrome.setIsVisible(isVisible),
  };

  return (
    <KibanaNoDataPageContext.Provider value={value}>
      <NoDataViewsPromptKibanaProvider {...dependencies}>
        <NoDataCardKibanaProvider {...dependencies}>
          <LegacyServicesProvider {...getLegacyServices(value)}>{children}</LegacyServicesProvider>
        </NoDataCardKibanaProvider>
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
