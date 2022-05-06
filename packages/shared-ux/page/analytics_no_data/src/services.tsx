/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import { Observable } from 'rxjs';

type DataView = unknown;

interface DataViewEditorOptions {
  onSave: (dataView: DataView) => void;
}

/**
 *
 */
export interface Services {
  addBasePath: (url: string) => string;
  canAccessFleet: boolean;
  canCreateNewDataView: boolean;
  currentAppId$: Observable<string | undefined>;
  dataViewsDocLink: string;
  hasDataView: () => Promise<boolean>;
  hasESData: () => Promise<boolean>;
  hasUserDataView: () => Promise<boolean>;
  kibanaGuideDocLink: string;
  navigateToUrl: (url: string) => Promise<void>;
  openDataViewEditor: (options: DataViewEditorOptions) => () => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
}

const PageAnalyticsNoDataContext = React.createContext<Services | null>(null);

/**
 *
 */
export const PageAnalyticsNoDataProvider: FC<Services> = ({ children, ...services }) => {
  return (
    <PageAnalyticsNoDataContext.Provider value={services}>
      {children}
    </PageAnalyticsNoDataContext.Provider>
  );
};

/**
 *
 */
export interface KibanaServices {
  coreStart: {
    application: {
      capabilities: {
        navLinks: {
          integrations: boolean;
        };
      };
      currentAppId$: Observable<string | undefined>;
      navigateToUrl: (url: string) => Promise<void>;
    };
    chrome: {
      setIsVisible: (isVisible: boolean) => void;
    };
    docLinks: {
      links: {
        indexPatterns: {
          introduction: string;
        };
        kibana: {
          guide: string;
        };
      };
    };
    http: {
      basePath: {
        prepend: (url: string) => string;
      };
    };
  };
  dataViews: {
    hasData: {
      hasDataView: () => Promise<boolean>;
      hasESData: () => Promise<boolean>;
      hasUserDataView: () => Promise<boolean>;
    };
  };
  dataViewEditor: {
    openEditor: (options: DataViewEditorOptions) => () => void;
    userPermissions: {
      editDataView: () => boolean;
    };
  };
}

/**
 *
 */
export const PageAnalyticsNoDataKibanaProvider: FC<KibanaServices> = ({
  children,
  ...services
}) => {
  const { coreStart, dataViewEditor, dataViews } = services;
  const value: Services = {
    addBasePath: coreStart.http.basePath.prepend,
    canAccessFleet: coreStart.application.capabilities.navLinks.integrations,
    canCreateNewDataView: dataViewEditor.userPermissions.editDataView(),
    currentAppId$: coreStart.application.currentAppId$,
    dataViewsDocLink: coreStart.docLinks.links.indexPatterns?.introduction,
    hasDataView: dataViews.hasData.hasDataView,
    hasESData: dataViews.hasData.hasESData,
    hasUserDataView: dataViews.hasData.hasUserDataView,
    kibanaGuideDocLink: coreStart.docLinks.links.kibana.guide,
    navigateToUrl: coreStart.application.navigateToUrl,
    openDataViewEditor: dataViewEditor.openEditor,
    setIsFullscreen: (isVisible: boolean) => coreStart.chrome.setIsVisible(isVisible),
  };

  return (
    <PageAnalyticsNoDataContext.Provider value={value}>
      {children}
    </PageAnalyticsNoDataContext.Provider>
  );
};

/**
 *
 */
export function useServices() {
  const context = useContext(PageAnalyticsNoDataContext);

  if (!context) {
    throw new Error(
      'PageAnalyticsNoDataContext is missing.  Ensure your component or React root is wrapped with PageAnalyticsNoDataProvider.'
    );
  }

  return context;
}
