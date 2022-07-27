/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import type { Observable } from 'rxjs';
import type { EuiTableFieldDataColumnType, SearchFilterConfig } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core-theme-browser';

import type { MountPoint, SavedObjectsFindOptionsReference } from '../types';
import { UserContentCommonSchema } from './table_list_view';

/**
 * Abstract external services for this component.
 */
export interface Services {
  application: {
    capabilities: {
      advancedSettings?: {
        save: boolean;
      };
    };
    getUrlForApp: (
      app: string,
      options: { path?: string; absolute?: boolean; deepLinkId?: string }
    ) => string;
  };
  toast: {
    addDanger: (params: { title: MountPoint<HTMLElement>; text: string }) => void;
  };
  savedObjectTagging?: {
    ui: {
      getTableColumnDefinition: () => EuiTableFieldDataColumnType<UserContentCommonSchema>;
      parseSearchQuery: (
        query: string,
        options?: {
          useName?: boolean;
          tagField?: string;
        }
      ) => {
        searchTerm: string;
        tagReferences: SavedObjectsFindOptionsReference[];
        valid: boolean;
      };
      getSearchBarFilter: (options?: {
        useName?: boolean;
        tagField?: string;
      }) => SearchFilterConfig;
    };
  };
  theme: {
    theme$?: Observable<CoreTheme>;
  };
  toMountPoint: (node: React.ReactNode, options: { theme$?: Observable<CoreTheme> }) => MountPoint;
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
export interface KibanaServices {
  applicationStart: Services['application'];
  toastStart: Services['toast'];
  savedObjectTaggingApi: Services['savedObjectTagging'];
  themeServiceStart: Services['theme'];
  kibanaReactToMountPoint: Services['toMountPoint'];
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const TableListViewKibanaProvider: FC<KibanaServices> = ({ children, ...services }) => {
  return (
    <TableListViewProvider
      application={services.applicationStart}
      toast={services.toastStart}
      savedObjectTagging={services.savedObjectTaggingApi}
      theme={services.themeServiceStart}
      toMountPoint={services.kibanaReactToMountPoint}
    >
      {children}
    </TableListViewProvider>
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
