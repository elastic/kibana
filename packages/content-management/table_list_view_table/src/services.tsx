/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useContext, useMemo } from 'react';
import type { Observable } from 'rxjs';

import {
  ContentEditorKibanaProvider,
  type SavedObjectsReference,
} from '@kbn/content-management-content-editor';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { FormattedRelative } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { RedirectAppLinksKibanaProvider } from '@kbn/shared-ux-link-redirect-app';
import { UserProfilesKibanaProvider } from '@kbn/content-management-user-profiles';

import { TAG_MANAGEMENT_APP_URL } from './constants';
import type { Tag } from './types';

type NotifyFn = (title: JSX.Element, text?: string) => void;

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
  /** Predicate to indicate if tagging features is enabled */
  isTaggingEnabled: () => boolean;
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
export const TableListViewProvider: FC<PropsWithChildren<Services>> = ({
  children,
  ...services
}) => {
  return <TableListViewContext.Provider value={services}>{children}</TableListViewContext.Provider>;
};

/**
 * Specific services for mounting React
 */
interface TableListViewStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
}

/**
 * Kibana-specific service types.
 */
export interface TableListViewKibanaDependencies {
  /** CoreStart contract */
  core: TableListViewStartServices & {
    application: {
      capabilities: {
        [key: string]: Readonly<Record<string, boolean | Record<string, boolean>>>;
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
    userProfile: {
      bulkGet: UserProfileServiceStart['bulkGet'];
    };
  };
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
export const TableListViewKibanaProvider: FC<
  PropsWithChildren<TableListViewKibanaDependencies>
> = ({ children, ...services }) => {
  const { core, savedObjectsTagging, FormattedRelative } = services;
  const { application, http, notifications, ...startServices } = core;

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
      <UserProfilesKibanaProvider core={core}>
        <ContentEditorKibanaProvider core={core} savedObjectsTagging={savedObjectsTagging}>
          <TableListViewProvider
            canEditAdvancedSettings={Boolean(application.capabilities.advancedSettings?.save)}
            getListingLimitSettingsUrl={() =>
              application.getUrlForApp('management', {
                path: `/kibana/settings?query=savedObjects:listingLimit`,
              })
            }
            notifyError={(title, text) => {
              notifications.toasts.addDanger({ title: toMountPoint(title, startServices), text });
            }}
            searchQueryParser={searchQueryParser}
            DateFormatterComp={(props) => <FormattedRelative {...props} />}
            currentAppId$={application.currentAppId$}
            navigateToUrl={application.navigateToUrl}
            isTaggingEnabled={() => Boolean(savedObjectsTagging)}
            getTagList={getTagList}
            TagList={TagList}
            itemHasTags={itemHasTags}
            getTagIdsFromReferences={getTagIdsFromReferences}
            getTagManagementUrl={() => core.http.basePath.prepend(TAG_MANAGEMENT_APP_URL)}
          >
            {children}
          </TableListViewProvider>
        </ContentEditorKibanaProvider>
      </UserProfilesKibanaProvider>
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
