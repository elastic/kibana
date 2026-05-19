import React, { type ReactNode } from 'react';
import type { ContentListCoreConfig, ContentListConfig, ContentListServices } from './types';
import type { ContentListFeatures, ContentListSupports } from '../features';
import type { DataSourceConfig } from '../datasource';
import type { ProfileCache } from '../services';
/**
 * Internal context value type.
 */
export type ContentListProviderContextValue = Omit<ContentListCoreConfig, 'id' | 'queryKeyScope'> & {
    /** Optional identifier (may be undefined if only `queryKeyScope` was provided). */
    id?: string;
    /** Resolved query key scope (always present after provider initialization). */
    queryKeyScope: string;
    /** Data source configuration. */
    dataSource: DataSourceConfig;
    /** Feature configuration. */
    features: ContentListFeatures;
    /** Resolved feature support flags. */
    supports: ContentListSupports;
    /** Services provided to the provider. */
    services?: ContentListServices;
};
/**
 * Context for the content list configuration.
 *
 * @internal Use `useContentListConfig` hook to access this context.
 */
export declare const ContentListContext: React.Context<ContentListProviderContextValue | null>;
/**
 * Props for the `ContentListProvider` component.
 */
export type ContentListProviderProps = ContentListConfig & {
    /** Child components that will have access to the content list context. */
    children: ReactNode;
    /** Optional services for the provider. */
    services?: ContentListServices;
    /** Feature configuration for enabling/customizing capabilities. */
    features?: ContentListFeatures;
    /**
     * Shared profile cache instance (created by the client provider).
     * When provided, enables user-profile resolution in field definitions,
     * table cells, and filter popovers.
     */
    profileCache?: ProfileCache;
};
/**
 * Main provider component for content list functionality, including data fetching
 * (via React Query), sorting, search, and tags filtering.
 *
 * Props like `dataSource`, `features`, and `services` should be stable references to avoid
 * unnecessary re-renders. Configuration from `features.sorting`, `features.pagination`, and
 * `features.search` is read once at mount; use a `key` prop to remount if you need to change
 * initial state dynamically.
 *
 * Service-dependent features wrap children with the appropriate context provider:
 *
 * - **Tags** (`services.tags`): wraps with `ContentManagementTagsProvider`, enabling tag
 *   display and filtering. The service's `parseSearchQuery` (if present) is passed through
 *   to support extracting tag filters from the search bar query text.
 * - **Favorites** (`services.favorites`): wraps with `FavoritesContextProvider`, enabling
 *   star buttons and starred filtering.
 * - **User profiles** (`services.userProfiles`): wraps with `ProfileCacheContext.Provider`,
 *   providing a shared {@link ProfileCache} for synchronous profile resolution.
 */
export declare const ContentListProvider: ({ children, dataSource, labels, item, isReadOnly, id, queryKeyScope: queryKeyScopeProp, features, services, profileCache, }: ContentListProviderProps) => JSX.Element;
/**
 * Hook to access the content list configuration context.
 *
 * This is a low-level hook that provides access to configuration and support flags.
 * For most use cases, prefer the feature-specific hooks like `useContentListItems`,
 * `useContentListSort`, etc.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The content list context including configuration and support flags.
 */
export declare const useContentListConfig: () => ContentListProviderContextValue;
