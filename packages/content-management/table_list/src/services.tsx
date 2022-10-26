/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo, useCallback } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
import type { Observable } from 'rxjs';
import type { FormattedRelative } from '@kbn/i18n-react';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { RedirectAppLinksKibanaProvider } from '@kbn/shared-ux-link-redirect-app';
import { InspectorKibanaProvider } from '@kbn/content-management-inspector';

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
  getSearchBarFilters?: () => SearchFilterConfig[];
  DateFormatterComp?: DateFormatter;
  TagList: FC<{ references: SavedObjectsReference[]; onClick?: (tag: { name: string }) => void }>;
  /** Predicate function to indicate if the saved object references include tags */
  itemHasTags: (references: SavedObjectsReference[]) => boolean;
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
    overlays: {
      openFlyout(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
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
      components: {
        TagList: React.FC<{
          object: {
            references: SavedObjectsReference[];
          };
          onClick?: (tag: { name: string; description: string; color: string }) => void;
        }>;
      };
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
      getTagIdsFromReferences: (references: SavedObjectsReference[]) => string[];
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

  const TagList = useMemo(() => {
    const Comp: Services['TagList'] = ({ references, onClick }) => {
      if (!savedObjectsTagging?.ui.components.TagList) {
        return null;
      }
      const PluginTagList = savedObjectsTagging.ui.components.TagList;
      return <PluginTagList object={{ references }} onClick={onClick} />;
    };

    return Comp;
  }, [savedObjectsTagging?.ui.components.TagList]);

  const itemHasTags = useCallback(
    (references: SavedObjectsReference[]) => {
      if (!savedObjectsTagging?.ui.getTagIdsFromReferences) {
        return false;
      }

      return savedObjectsTagging.ui.getTagIdsFromReferences(references).length > 0;
    },
    [savedObjectsTagging?.ui]
  );

  return (
    <RedirectAppLinksKibanaProvider coreStart={core}>
      <InspectorKibanaProvider core={core} toMountPoint={toMountPoint}>
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
          getSearchBarFilters={getSearchBarFilters}
          searchQueryParser={searchQueryParser}
          DateFormatterComp={(props) => <FormattedRelative {...props} />}
          currentAppId$={core.application.currentAppId$}
          navigateToUrl={core.application.navigateToUrl}
          TagList={TagList}
          itemHasTags={itemHasTags}
        >
          {children}
        </TableListViewProvider>
      </InspectorKibanaProvider>
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
