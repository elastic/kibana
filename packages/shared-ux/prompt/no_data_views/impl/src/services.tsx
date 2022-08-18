/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
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
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor } = services;

  return (
    <NoDataViewsPromptContext.Provider
      value={{ canCreateNewDataView, dataViewsDocLink, openDataViewEditor }}
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
  return (
    <NoDataViewsPromptContext.Provider
      value={{
        dataViewsDocLink: services.coreStart.docLinks.links.indexPatterns?.introduction,
        canCreateNewDataView: services.dataViewEditor.userPermissions.editDataView(),
        openDataViewEditor: services.dataViewEditor.openEditor,
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
