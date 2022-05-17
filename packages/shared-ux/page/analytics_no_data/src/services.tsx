/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import { Observable } from 'rxjs';

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
 * A subset of the `DataViewEditorOptions` interface relevant to this component.
 *
 * @see: src/plugins/data_view_editor/public/types.ts
 */
interface DataViewEditorOptions {
  /** Handler to be invoked when the Data View Editor completes a save operation. */
  onSave: (dataView: DataView) => void;
  /** If set to false, will skip empty prompt in data view editor. */
  showEmptyPrompt?: boolean;
}

/**
 * A list of Services that are consumed by this component.
 *
 * This list is temporary, a stopgap as we migrate to a package-based architecture, where
 * services are not collected in a single package.  In order to make the transition, this
 * interface is intentionally "flat".
 *
 * Expect this list to dwindle to zero as `@kbn/shared-ux-components` are migrated to their
 * own packages, (and `@kbn/shared-ux-services` is removed).
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

const AnalyticsNoDataPageContext = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component.
 */
export const AnalyticsNoDataPageProvider: FC<Services> = ({ children, ...services }) => {
  return (
    <AnalyticsNoDataPageContext.Provider value={services}>
      {children}
    </AnalyticsNoDataPageContext.Provider>
  );
};

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component and its dependencies.
 */
export interface AnalyticsNoDataPageKibanaDependencies {
  coreStart: {
    application: {
      capabilities: {
        navLinks: Record<string, boolean>;
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
 * Kibana-specific Provider that maps dependencies to services.
 */
export const AnalyticsNoDataPageKibanaProvider: FC<AnalyticsNoDataPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  const { coreStart, dataViewEditor, dataViews } = dependencies;
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
    <AnalyticsNoDataPageContext.Provider value={value}>
      {children}
    </AnalyticsNoDataPageContext.Provider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(AnalyticsNoDataPageContext);

  if (!context) {
    throw new Error(
      'AnalyticsNoDataPageContext is missing.  Ensure your component or React root is wrapped with AnalyticsNoDataPageContext.'
    );
  }

  return context;
}
