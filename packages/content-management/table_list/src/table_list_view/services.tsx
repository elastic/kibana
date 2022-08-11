/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import type { EuiTableFieldDataColumnType, SearchFilterConfig } from '@elastic/eui';

import { UserContentCommonSchema } from './table_list_view';

type NotifyFn = (notifyArgs: { title: string | JSX.Element; text: string }) => void;

interface SavedObjectsReference {
  type: string;
  id: string;
}

export type DateFormatter = (props: {
  value: number;
  children: (formattedDate: string) => React.ReactElement;
}) => React.ReactElement;

/**
 * Abstract external services for this component.
 */
export interface Services {
  canEditAdvancedSettings: boolean;
  getListingLimitSettingsUrl: () => string;
  notifyError: NotifyFn;
  getTagsColumnDefinition?: () => EuiTableFieldDataColumnType<UserContentCommonSchema> | undefined;
  searchQueryParser?: (searchQuery: string) => {
    searchQuery: string;
    references?: SavedObjectsReference[];
  };
  getSearchBarFilters?: () => SearchFilterConfig[];
  DateFormatterComp?: DateFormatter;
}

const TableListViewContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const TableListViewProvider: FC<Services> = ({ children, ...services }) => {
  return <TableListViewContext.Provider value={services}>{children}</TableListViewContext.Provider>;
};

/**
 * Kibana-specific service types.
 */
// export interface KibanaServices {
//   // applicationStart: Services['application'];
//   // toastStart: Services['toast'];
//   // savedObjectTaggingApi: Services['savedObjectTagging'];
//   // themeServiceStart: Services['theme'];
//   // kibanaReactToMountPoint: Services['toMountPoint'];
// }

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const TableListViewKibanaProvider: FC<{}> = ({ children, ...services }) => {
  return (
    <div>{children}</div>
    // <TableListViewProvider
    //   canEditAdvancedSettings={}
    //   // application={services.applicationStart}
    //   // toast={services.toastStart}
    //   // savedObjectTagging={services.savedObjectTaggingApi}
    //   // theme={services.themeServiceStart}
    //   // toMountPoint={services.kibanaReactToMountPoint}
    // >
    //   {children}
    // </TableListViewProvider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(TableListViewContext);

  if (!context) {
    throw new Error(
      'TableListViewContext is missing. Ensure your component or React root is wrapped with <TableListViewProvider /> or <TableListViewKibanaProvider />.'
    );
  }

  return context;
}
