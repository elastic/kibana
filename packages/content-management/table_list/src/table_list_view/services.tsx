/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import type { EuiTableFieldDataColumnType, SearchFilterConfig } from '@elastic/eui';
import type { Observable } from 'rxjs';

import { UserContentCommonSchema } from './table_list_view';

type UnmountCallback = () => void;
type MountPoint = (element: HTMLElement) => UnmountCallback;
type NotifyFn = (title: JSX.Element, text?: string) => void;

export interface SavedObjectsReference {
  id: string;
  name: string;
  type: string;
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
  searchQueryParser?: (searchQuery: string) => {
    searchQuery: string;
    references?: SavedObjectsReference[];
  };
  getTagsColumnDefinition?: () => EuiTableFieldDataColumnType<UserContentCommonSchema> | undefined;
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

export interface TableListViewKibanaDependencies {
  core: {
    application: {
      capabilities: {
        advancedSettings?: {
          save: boolean;
        };
      };
      getUrlForApp: (app: string, options: { path: string }) => string;
    };
    notifications: {
      toasts: {
        addDanger: (notifyArgs: { title: MountPoint; text?: string }) => void;
      };
    };
  };
  toMountPoint: (
    node: React.ReactNode,
    options?: { theme$: Observable<{ readonly darkMode: boolean }> }
  ) => MountPoint;
  savedObjectTaggingApi?: {
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
        tagReferences: SavedObjectsReference[];
        valid: boolean;
      };
      getSearchBarFilter: (options?: {
        useName?: boolean;
        tagField?: string;
      }) => SearchFilterConfig;
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const TableListViewKibanaProvider: FC<TableListViewKibanaDependencies> = ({
  children,
  ...services
}) => {
  const { core, toMountPoint, savedObjectTaggingApi } = services;
  return (
    <TableListViewProvider
      canEditAdvancedSettings={Boolean(core.application.capabilities.advancedSettings?.save)}
      getListingLimitSettingsUrl={() =>
        core.application.getUrlForApp('management', {
          path: `/kibana/settings?query=savedObjects:listingLimit`,
        })
      }
      notifyError={(title, text) => {
        core.notifications.toasts.addDanger({ title: toMountPoint(title), text });
      }}
      getTagsColumnDefinition={savedObjectTaggingApi?.ui.getTableColumnDefinition}
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
