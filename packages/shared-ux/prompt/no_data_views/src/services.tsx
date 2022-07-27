/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';

/**
 * TODO: `DataView` is a class exported by `src/plugins/data_views/public`.  Since this service
 * is contained in this package-- and packages can only depend on other packages and never on
 * plugins-- we have to set this to `unknown`.  If and when `DataView` is exported from a
 * stateless package, we can remove this.
 *
 * @see: https://github.com/elastic/kibana/issues/127695
 */
type DataView = unknown;

/**
 * A subset of the `DataViewEditorOptions` interface relevant to our service and components.
 *
 * @see: src/plugins/data_view_editor/public/types.ts
 */
interface DataViewEditorOptions {
  /** Handler to be invoked when the Data View Editor completes a save operation. */
  onSave: (dataView: DataView) => void;
}

/**
 * Abstract external services for this component.
 */
export interface NoDataViewsPromptServices {
  /** True if the user has permission to create a new Data View, false otherwise. */
  canCreateNewDataView: boolean;
  /** A method to open the Data View Editor flow. */
  openDataViewEditor: (options: DataViewEditorOptions) => () => void;
  /** A link to information about Data Views in Kibana */
  dataViewsDocLink: string;
}

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
 * Kibana-specific service types.
 */
export interface NoDataViewsPromptKibanaServices {
  coreStart: {
    docLinks: {
      links: {
        indexPatterns: {
          introduction: string;
        };
      };
    };
  };
  dataViewEditor: {
    userPermissions: {
      editDataView: () => boolean;
    };
    openEditor: (options: DataViewEditorOptions) => () => void;
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const NoDataViewsPromptKibanaProvider: FC<NoDataViewsPromptKibanaServices> = ({
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
