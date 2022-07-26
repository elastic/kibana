/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { NoDataPageProps } from '@kbn/shared-ux-components';

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
export interface KibanaNoDataPageServices {
  /** True if the cluster contains data, false otherwise. */
  hasESData: () => Promise<boolean>;
  /** True if Kibana instance contains user-created data view, false otherwise. */
  hasUserDataView: () => Promise<boolean>;

  // Provided to Legacy Services, not relevant to this component.  Will be removed.
  /** Append the server base path to a relative URL. */
  addBasePath: (url: string) => string;
  /** True if the user has permission to access Fleet, false otherwise. */
  canAccessFleet: boolean;
  /** True if the user has permission to create a new Data View, false otherwise. */
  canCreateNewDataView: boolean;
  /** Observable storing the active, current application ID. */
  currentAppId$: Observable<string | undefined>;
  /** A link to information about Data Views in Kibana */
  dataViewsDocLink: string;
  /** True if Kibana instance contains any data view, including system-created ones. */
  hasDataView: () => Promise<boolean>;
  /** Use Kibana to navigate async to a different URL. */
  navigateToUrl: (url: string) => Promise<void> | void;
  /** A method to open the Data View Editor flow. */
  openDataViewEditor: (options: DataViewEditorOptions) => () => void;
  /** Set the Kibana chrome and browser to full screen mode. */
  setIsFullscreen: (isFullscreen: boolean) => void;
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component and its dependencies.
 */
export interface KibanaNoDataPageKibanaDependencies {
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
 * Props for `KibanaNoDataPage`.
 */
export interface KibanaNoDataPageProps {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** `NoDataPage` configuration; see `NoDataPageProps`. */
  noDataConfig: NoDataPageProps;
}
