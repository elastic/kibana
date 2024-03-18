/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPromptProps } from '@elastic/eui';
import type { ILocatorClient } from '@kbn/share-plugin/common/url_service';

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
  /** if set to true allows creation of an ad-hoc data view from data view editor */
  allowAdHocDataView?: boolean;
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
  /** Get a handler for trying ES|QL */
  onTryESQL: (() => void) | undefined;
  /** A link to the documentation for ES|QL */
  esqlDocLink: string;
}

export type NavigateToAppFn = (appId: string, options?: { path?: string; state?: unknown }) => void;
export type LocatorClient = ILocatorClient;

/**
 * Kibana-specific service types.
 */
export interface NoDataViewsPromptKibanaDependencies {
  coreStart: {
    docLinks: {
      links: {
        indexPatterns: {
          introduction: string;
        };
        query: {
          queryESQL: string;
        };
      };
    };
    application: {
      navigateToApp: NavigateToAppFn;
    };
  };
  dataViewEditor: {
    userPermissions: {
      editDataView: () => boolean;
    };
    openEditor: (options: DataViewEditorOptions) => () => void;
  };
  share?: {
    url: {
      locators: LocatorClient;
    };
  };
}

export interface NoDataViewsPromptComponentProps {
  /** True if the user has permission to create a data view, false otherwise. */
  canCreateNewDataView: boolean;
  /** Link to documentation on data views. */
  dataViewsDocLink?: string;
  /** The background color of the prompt; defaults to `plain`. */
  emptyPromptColor?: EuiEmptyPromptProps['color'];
  /** Click handler for create button. **/
  onClickCreate?: () => void;
  /** Handler for someone wanting to try ES|QL. */
  onTryESQL?: () => void;
  /** Link to documentation on ES|QL. */
  esqlDocLink?: string;
}

// TODO: https://github.com/elastic/kibana/issues/127695
export interface NoDataViewsPromptProps {
  /** if set to true allows creation of an ad-hoc data view from data view editor */
  allowAdHocDataView?: boolean;
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** Handler for when try ES|QL is clicked and user has been navigated to try ES|QL in discover. */
  onESQLNavigationComplete?: () => void;
}
