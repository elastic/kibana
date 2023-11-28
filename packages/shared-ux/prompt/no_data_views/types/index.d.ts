/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPromptProps } from '@elastic/eui';

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
  showESQLViewLocator: DiscoverAppLocator;
  // defaultDataView: DataView;
  dataViews: DataViewsServicePublic;
}
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
      };
    };
  };
  dataViewEditor: {
    userPermissions: {
      editDataView: () => boolean;
    };
    openEditor: (options: DataViewEditorOptions) => () => void;
  };
  discover: {
    locator: {
      navigate: {
        savedSearchId: string;
        indexPatternId: string;
      };
    };
  };
  dataView: DataViewsServicePublic;
}

export interface NoDataViewsPromptComponentProps {
  /** True if the user has permission to create a data view, false otherwise. */
  canCreateNewDataView: boolean;
  /** Click handler for create button. **/
  onClickCreate?: () => void;
  /** Link to documentation on data views. */
  dataViewsDocLink?: string;
  /** The background color of the prompt; defaults to `plain`. */
  emptyPromptColor?: EuiEmptyPromptProps['color'];
  /** Show a button to the user to navigate to the ES|QL Discover */
  showESQLView: boolean;
}

// TODO: https://github.com/elastic/kibana/issues/127695
export interface NoDataViewsPromptProps {
  /** Handler for successfully creating a new data view. */
  onDataViewCreated: (dataView: unknown) => void;
  /** if set to true allows creation of an ad-hoc data view from data view editor */
  allowAdHocDataView?: boolean;
  /** show the link to ESQL Discover */
  showESQLView?: boolean;
}
