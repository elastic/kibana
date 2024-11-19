/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext } from 'react';

import type {
  NoDataViewsPromptServices,
  NoDataViewsPromptKibanaDependencies,
} from '@kbn/shared-ux-prompt-no-data-views-types';
import { useOnTryESQL } from './hooks';

const NoDataViewsPromptContext = React.createContext<NoDataViewsPromptServices | null>(null);

/**
 * Abstract external service Provider.
 */
export const NoDataViewsPromptProvider: FC<PropsWithChildren<NoDataViewsPromptServices>> = ({
  children,
  ...services
}) => {
  // Typescript types are widened to accept more than what is needed.  Take only what is necessary
  // so the context remains clean.
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor, onTryESQL, esqlDocLink } =
    services;

  return (
    <NoDataViewsPromptContext.Provider
      value={{
        canCreateNewDataView,
        dataViewsDocLink,
        openDataViewEditor,
        onTryESQL,
        esqlDocLink,
      }}
    >
      {children}
    </NoDataViewsPromptContext.Provider>
  );
};

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const NoDataViewsPromptKibanaProvider: FC<
  PropsWithChildren<NoDataViewsPromptKibanaDependencies>
> = ({ children, ...services }) => {
  const {
    share,
    coreStart: {
      application: { navigateToApp },
    },
  } = services;
  const onTryESQL = useOnTryESQL({ locatorClient: share?.url.locators, navigateToApp });

  return (
    <NoDataViewsPromptContext.Provider
      value={{
        dataViewsDocLink: services.coreStart.docLinks.links.indexPatterns?.introduction,
        canCreateNewDataView: services.dataViewEditor.userPermissions.editDataView(),
        openDataViewEditor: services.dataViewEditor.openEditor,
        esqlDocLink: services.coreStart.docLinks.links.query?.queryESQL,
        onTryESQL,
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
