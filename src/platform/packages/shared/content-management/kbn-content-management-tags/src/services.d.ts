import { type FC, type PropsWithChildren } from 'react';
import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { ParsedQuery, Tag } from './types';
/**
 * Core services interface for content management tags functionality.
 *
 * @property getTagList - Synchronously retrieves the list of all available tags.
 * @property parseSearchQuery - Optional function to parse a search query string and extract tag filters.
 * @property onError - Optional error handler for reporting errors to the user. Defaults to noop.
 */
interface Services {
    getTagList: () => Tag[];
    parseSearchQuery?: (searchQuery: string) => ParsedQuery;
    /** Optional error handler for reporting errors to the user. Defaults to noop. */
    onError?: (error: Error, title: string) => void;
}
/**
 * Public type alias for the content management tags services interface.
 *
 * Use this type when implementing custom service providers or when type-checking
 * service objects passed to {@link ContentManagementTagsProvider}.
 */
export type ContentManagementTagsServices = Services;
/**
 * Dependencies required from Kibana plugins to enable content management tags functionality.
 *
 * This interface defines the contract between the content management tags package and
 * the Kibana plugin ecosystem. Consumers should provide these dependencies when using
 * {@link ContentManagementTagsKibanaProvider}.
 *
 * @example
 * ```tsx
 * const dependencies: ContentManagementTagsKibanaDependencies = {
 *   savedObjectsTagging: {
 *     ui: savedObjectsTaggingOss.getTaggingApi().ui,
 *   },
 *   core: {
 *     notifications: coreStart.notifications,
 *   },
 * };
 * ```
 */
export interface ContentManagementTagsKibanaDependencies {
    /** Tagging UI utilities from the saved objects tagging plugin. */
    savedObjectsTagging: {
        ui: Pick<SavedObjectsTaggingApiUi, 'getTagList' | 'parseSearchQuery' | 'getSearchBarFilter' | 'getTagIdFromName'>;
    };
    /** Core Kibana services including notifications for error reporting. */
    core: {
        notifications: {
            toasts: Pick<IToasts, 'addError'>;
        };
    };
}
/**
 * Context provider for content management tags services.
 *
 * Use this provider when you want to supply custom tag services directly,
 * without integrating with Kibana's saved objects tagging plugin.
 *
 * For Kibana plugin integration, use {@link ContentManagementTagsKibanaProvider} instead.
 *
 * @example
 * ```tsx
 * <ContentManagementTagsProvider
 *   getTagList={() => myTags}
 *   parseSearchQuery={(query) => parseMyQuery(query)}
 *   onError={(err, title) => console.error(title, err)}
 * >
 *   <MyApp />
 * </ContentManagementTagsProvider>
 * ```
 */
export declare const ContentManagementTagsProvider: FC<PropsWithChildren<ContentManagementTagsServices>>;
/**
 * Kibana-integrated context provider for content management tags services.
 *
 * This provider adapts Kibana's saved objects tagging plugin API to the content management
 * tags interface. It automatically handles tag list retrieval, search query parsing with
 * EUI Query syntax support, and error reporting via toast notifications.
 *
 * Use this provider in Kibana plugins that need tag functionality. For standalone usage
 * without Kibana dependencies, use {@link ContentManagementTagsProvider} instead.
 *
 * @example
 * ```tsx
 * // In a Kibana plugin's application component
 * <ContentManagementTagsKibanaProvider
 *   savedObjectsTagging={{ ui: savedObjectsTaggingOss.getTaggingApi().ui }}
 *   core={{ notifications: coreStart.notifications }}
 * >
 *   <MyKibanaApp />
 * </ContentManagementTagsKibanaProvider>
 * ```
 */
export declare const ContentManagementTagsKibanaProvider: FC<PropsWithChildren<ContentManagementTagsKibanaDependencies>>;
/**
 * Hook to access content management tags services from the context.
 *
 * Returns the services object if used within a `ContentManagementTagsProvider`,
 * or `undefined` if the context is not available. This allows components to
 * gracefully handle scenarios where tags support may not be configured.
 *
 * @returns The `Services` object containing `getTagList` and optionally `parseSearchQuery`,
 *          or `undefined` if no provider is present in the component tree.
 *
 * @example
 * ```tsx
 * const services = useServices();
 *
 * // Check if services are available before using
 * if (services) {
 *   const tags = services.getTagList();
 * }
 * ```
 */
export declare const useServices: () => Services | undefined;
export {};
