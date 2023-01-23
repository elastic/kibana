/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo, useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { FormattedRelative } from '@kbn/i18n-react';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { RedirectAppLinksKibanaProvider } from '@kbn/shared-ux-link-redirect-app';
import { ContentEditorKibanaProvider } from '@kbn/content-management-content-editor';

import { TAG_MANAGEMENT_APP_URL } from './constants';
import type { Tag } from './types';

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

export interface TagListProps {
  references: SavedObjectsReference[];
  onClick?: (tag: Tag) => void;
  tagRender?: (tag: Tag) => JSX.Element;
}

/**
 * Abstract external services for this component.
 */
export interface Services {
  canEditAdvancedSettings: boolean;
  getListingLimitSettingsUrl: () => string;
  notifyError: NotifyFn;
  currentAppId$: Observable<string | undefined>;
  navigateToUrl: (url: string) => Promise<void> | void;
  searchQueryParser?: (searchQuery: string) => Promise<{
    searchQuery: string;
    references?: SavedObjectsFindOptionsReference[];
    referencesToExclude?: SavedObjectsFindOptionsReference[];
  }>;
  DateFormatterComp?: DateFormatter;
  /** Handler to retrieve the list of available tags */
  getTagList: () => Tag[];
  TagList: FC<TagListProps>;
  /** Predicate function to indicate if some of the saved object references are tags */
  itemHasTags: (references: SavedObjectsReference[]) => boolean;
  /** Handler to return the url to navigate to the kibana tags management */
  getTagManagementUrl: () => string;
  getTagIdsFromReferences: (references: SavedObjectsReference[]) => string[];
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
    http: {
      basePath: {
        prepend: (path: string) => string;
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
          onClick?: (tag: Tag) => void;
          tagRender?: (tag: Tag) => JSX.Element;
        }>;
        SavedObjectSaveModalTagSelector: React.FC<{
          initialSelection: string[];
          onTagsSelected: (ids: string[]) => void;
        }>;
      };
      parseSearchQuery: (
        query: string,
        options?: {
          useName?: boolean;
          tagField?: string;
        }
      ) => Promise<{
        searchTerm: string;
        tagReferences: SavedObjectsFindOptionsReference[];
        tagReferencesToExclude: SavedObjectsFindOptionsReference[];
        valid: boolean;
      }>;
      getTagList: () => Tag[];
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

  const searchQueryParser = useMemo(() => {
    if (savedObjectsTagging) {
      return async (searchQuery: string) => {
        const res = await savedObjectsTagging.ui.parseSearchQuery(searchQuery, { useName: true });
        return {
          searchQuery: res.searchTerm,
          references: res.tagReferences,
          referencesToExclude: res.tagReferencesToExclude,
        };
      };
    }
  }, [savedObjectsTagging]);

  const TagList = useMemo(() => {
    const Comp: Services['TagList'] = ({ references, onClick, tagRender }) => {
      if (!savedObjectsTagging?.ui.components.TagList) {
        return null;
      }
      const PluginTagList = savedObjectsTagging.ui.components.TagList;
      return <PluginTagList object={{ references }} onClick={onClick} tagRender={tagRender} />;
    };

    return Comp;
  }, [savedObjectsTagging?.ui.components.TagList]);

  const getTagIdsFromReferences = useCallback(
    (references: SavedObjectsReference[]) => {
      if (!savedObjectsTagging?.ui.getTagIdsFromReferences) {
        return [];
      }

      return savedObjectsTagging.ui.getTagIdsFromReferences(references);
    },
    [savedObjectsTagging?.ui]
  );

  const getTagList = useCallback(() => {
    if (!savedObjectsTagging?.ui.getTagList) {
      return [];
    }

    return savedObjectsTagging.ui.getTagList();
  }, [savedObjectsTagging?.ui]);

  const itemHasTags = useCallback(
    (references: SavedObjectsReference[]) => {
      return getTagIdsFromReferences(references).length > 0;
    },
    [getTagIdsFromReferences]
  );

  return (
    <RedirectAppLinksKibanaProvider coreStart={core}>
      <ContentEditorKibanaProvider
        core={core}
        toMountPoint={toMountPoint}
        savedObjectsTagging={savedObjectsTagging}
      >
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
          searchQueryParser={searchQueryParser}
          DateFormatterComp={(props) => <FormattedRelative {...props} />}
          currentAppId$={core.application.currentAppId$}
          navigateToUrl={core.application.navigateToUrl}
          getTagList={getTagList}
          TagList={TagList}
          itemHasTags={itemHasTags}
          getTagIdsFromReferences={getTagIdsFromReferences}
          getTagManagementUrl={() => core.http.basePath.prepend(TAG_MANAGEMENT_APP_URL)}
        >
          {children}
        </TableListViewProvider>
      </ContentEditorKibanaProvider>
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
