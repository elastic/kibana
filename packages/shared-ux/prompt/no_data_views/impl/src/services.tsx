/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

// TODO: clintandrewhall - I would love to see these moved to a `@kbn/discover-locators` package.
import type { DiscoverEsqlLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_ESQL_LOCATOR } from '@kbn/deeplinks-analytics';

import type {
  NoDataViewsPromptServices,
  NoDataViewsPromptKibanaDependencies,
} from '@kbn/shared-ux-prompt-no-data-views-types';

const NoDataViewsPromptContext = React.createContext<NoDataViewsPromptServices | null>(null);

/**
 * Abstract external service Provider.
 */
export const NoDataViewsPromptProvider: FC<NoDataViewsPromptServices> = ({
  children,
  ...services
}) => {
  // Typescript types are widened to accept more than what is needed.  Take only what is necessary
  // so the context remains clean.
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor, getOnTryEsqlHandler } =
    services;

  return (
    <NoDataViewsPromptContext.Provider
      value={{
        canCreateNewDataView,
        dataViewsDocLink,
        openDataViewEditor,
        getOnTryEsqlHandler,
      }}
    >
      {children}
    </NoDataViewsPromptContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const NoDataViewsPromptKibanaProvider: FC<NoDataViewsPromptKibanaDependencies> = ({
  children,
  ...services
}) => {
  const {
    share,
    coreStart: {
      application: { navigateToApp },
    },
  } = services;

  const getOnTryEsqlHandler = async () => {
    if (!share) {
      return;
    }

    const location = await share.url.locators
      .get<DiscoverEsqlLocatorParams>(DISCOVER_ESQL_LOCATOR)
      ?.getLocation({});

    if (!location) {
      return;
    }

    return () => navigateToApp(location.app, { path: location.path, state: location.state });
  };

  return (
    <NoDataViewsPromptContext.Provider
      value={{
        dataViewsDocLink: services.coreStart.docLinks.links.indexPatterns?.introduction,
        canCreateNewDataView: services.dataViewEditor.userPermissions.editDataView(),
        openDataViewEditor: services.dataViewEditor.openEditor,
        getOnTryEsqlHandler,
      }}
    >
      {children}
    </NoDataViewsPromptContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(NoDataViewsPromptContext);

  if (!context) {
    throw new Error(
      'NoDataViewsPromptContext is missing.  Ensure your component or React root is wrapped with NoDataViewsPromptProvider.'
    );
  }

  return context;
}
