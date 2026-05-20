import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { Observable } from 'rxjs';
import { type SavedObjectsReference } from '@kbn/content-management-content-editor';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService, UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { FormattedRelative } from '@kbn/i18n-react';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
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
    /** Predicate to indicate if favorites features is enabled */
    isFavoritesEnabled: () => Promise<boolean>;
    /** Predicate function to indicate if some of the saved object references are tags */
    itemHasTags: (references: SavedObjectsReference[]) => boolean;
    /** Handler to return the url to navigate to the kibana tags management */
    getTagManagementUrl: () => string;
    getTagIdsFromReferences: (references: SavedObjectsReference[]) => string[];
    /** Whether versioning is enabled for the current kibana instance. (aka is Serverless)
     This is used to determine if we should show the version mentions in the help text.*/
    isKibanaVersioningEnabled: boolean;
}
/**
 * Abstract external service Provider.
 */
export declare const TableListViewProvider: FC<PropsWithChildren<Services>>;
/**
 * Specific services for mounting React
 */
interface TableListViewStartServices {
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    i18n: I18nStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: UserProfileService;
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
            getUrlForApp: (app: string, options: {
                path: string;
            }) => string;
            currentAppId$: Observable<string | undefined>;
            navigateToUrl: (url: string) => Promise<void> | void;
        };
        notifications: {
            toasts: {
                addDanger: (notifyArgs: {
                    title: MountPoint;
                    text?: string;
                }) => void;
            };
        };
        http: {
            basePath: {
                prepend: (path: string) => string;
            };
        };
        overlays: {
            openSystemFlyout(content: React.ReactElement, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
        };
        userProfile: {
            bulkGet: UserProfileServiceStart['bulkGet'];
        };
        rendering: {
            addContext: (element: React.ReactNode) => React.ReactElement;
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
            parseSearchQuery: (query: string, options?: {
                useName?: boolean;
                tagField?: string;
            }) => Promise<{
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
    /**
     * The favorites client to enable the favorites feature.
     */
    favorites?: FavoritesClientPublic;
    /**
     * Content insights client to enable content insights features.
     */
    contentInsightsClient?: ContentInsightsClientPublic;
    /**
     * Flag to indicate if Kibana versioning is enabled. (aka not Serverless)
     * Used to determine if we should show the version mentions in the help text.
     */
    isKibanaVersioningEnabled?: boolean;
}
/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export declare const TableListViewKibanaProvider: FC<PropsWithChildren<TableListViewKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
export {};
