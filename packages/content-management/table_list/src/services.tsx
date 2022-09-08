/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo } from 'react';
import type { EuiTableFieldDataColumnType, SearchFilterConfig } from '@elastic/eui';
import type { Observable } from 'rxjs';
import type { FormattedRelative } from '@kbn/i18n-react';
import { RedirectAppLinksKibanaProvider } from '@kbn/shared-ux-link-redirect-app';

import { UserContentCommonSchema } from './table_list_view';

type UnmountCallback = () => void;
type MountPoint = (element: HTMLElement) => UnmountCallback;
type NotifyFn = (title: JSX.Element, text?: string) => void;

export interface SavedObjectsReference {
  id: string;
  name: string;
  type: string;
}

export type SavedObjectsFindOptionsReference = Omit<SavedObjectsReference, 'name'>;

export type DateFormatter = (props: {
  value: number;
  children: (formattedDate: string) => JSX.Element;
}) => JSX.Element;

/**
 * Abstract external services for this component.
 */
export interface Services {
  canEditAdvancedSettings: boolean;
  getListingLimitSettingsUrl: () => string;
  notifyError: NotifyFn;
  currentAppId$: Observable<string | undefined>;
  navigateToUrl: (url: string) => Promise<void> | void;
  searchQueryParser?: (searchQuery: string) => {
    searchQuery: string;
    references?: SavedObjectsFindOptionsReference[];
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
  /** CoreStart contract */
  core: {
    application: {
      capabilities: {
        advancedSettings?: {
          save: boolean;
        };
      };
      getUrlForApp: (app: string, options: { path: string }) => string;
      currentAppId$: Observable<string | undefined>;
      navigateToUrl: (url: string) => Promise<void> | void;
    };
    notifications: {
      toasts: {
        addDanger: (notifyArgs: { title: MountPoint; text?: string }) => void;
      };
    };
  };
  /**
   * Handler from the '@kbn/kibana-react-plugin/public' Plugin
   *
   * ```
   * import { toMountPoint } from '@kbn/kibana-react-plugin/public';
   * ```
   */
  toMountPoint: (
    node: React.ReactNode,
    options?: { theme$: Observable<{ readonly darkMode: boolean }> }
  ) => MountPoint;
  /**
   * The public API from the savedObjectsTaggingOss plugin.
   * It is returned by calling `getTaggingApi()` from the SavedObjectTaggingOssPluginStart
   *
   * ```js
   * const savedObjectsTagging = savedObjectsTaggingOss?.getTaggingApi()
   * ```
   */
  savedObjectsTagging?: {
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
  /** The <FormattedRelative /> component from the @kbn/i18n-react package */
  FormattedRelative: typeof FormattedRelative;
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const TableListViewKibanaProvider: FC<TableListViewKibanaDependencies> = ({
  children,
  ...services
}) => {
  const { core, toMountPoint, savedObjectsTagging, FormattedRelative } = services;

  const getSearchBarFilters = useMemo(() => {
    if (savedObjectsTagging) {
      return () => [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })];
    }
  }, [savedObjectsTagging]);

  const searchQueryParser = useMemo(() => {
    if (savedObjectsTagging) {
      return (searchQuery: string) => {
        const res = savedObjectsTagging.ui.parseSearchQuery(searchQuery, { useName: true });
        return {
          searchQuery: res.searchTerm,
          references: res.tagReferences,
        };
      };
    }
  }, [savedObjectsTagging]);

  return (
    <RedirectAppLinksKibanaProvider coreStart={core}>
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
        getTagsColumnDefinition={savedObjectsTagging?.ui.getTableColumnDefinition}
        getSearchBarFilters={getSearchBarFilters}
        searchQueryParser={searchQueryParser}
        DateFormatterComp={(props) => <FormattedRelative {...props} />}
        currentAppId$={core.application.currentAppId$}
        navigateToUrl={core.application.navigateToUrl}
      >
        {children}
      </TableListViewProvider>
    </RedirectAppLinksKibanaProvider>
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
