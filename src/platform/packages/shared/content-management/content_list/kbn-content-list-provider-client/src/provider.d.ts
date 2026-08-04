import { type ReactNode } from 'react';
import type { ContentListCoreConfig, DataSourceConfig } from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn, ContentListClientServices, ContentListClientFeatures, ContentListKibanaCore } from './types';
/**
 * Props for the Client provider.
 *
 * This provider wraps an existing `TableListView`-style `findItems` function and handles
 * client-side sorting, filtering, and pagination.
 */
export type ContentListClientProviderProps = ContentListCoreConfig & {
    children?: ReactNode;
    /** The consumer's existing `findItems` function (same signature as `TableListView`). */
    findItems: TableListViewFindItemsFn;
    /**
     * A relevant subset of the Kibana `CoreStart` contract.
     */
    core: ContentListKibanaCore;
    /**
     * Feature configuration. Extends the base {@link ContentListFeatures} with Kibana-specific capabilities.
     */
    features?: ContentListClientFeatures;
    /**
     * Optional domain services. All fields are feature-scoped and independent..
     */
    services?: ContentListClientServices;
    /** Called after each successful item fetch. */
    onFetchSuccess?: DataSourceConfig['onFetchSuccess'];
};
/**
 * Client-side content list provider.
 *
 * Wraps an existing `TableListView`-style `findItems` function and provides
 * client-side sorting, filtering, and pagination. The strategy handles transformation
 * of `UserContentCommonSchema` items to `ContentListItem` format and caches the
 * full item set for use by `getFacets` implementations.
 *
 * When `services.tags` is provided, it constructs a `FilterFacetConfig<Tag>`
 * for `features.tags` that computes tag facets from the cached item set.
 * When `services.userProfiles` is provided, it constructs a
 * `FilterFacetConfig<UserProfileEntry>` for `features.userProfiles` the same way.
 *
 * `core.uiSettings` is read once at mount to determine the default page size
 * from the `savedObjects:perPage` user setting. An explicit
 * `features.pagination.initialPageSize` takes priority over the uiSettings value.
 *
 * `core` and `services.savedObjectsTagging` feed an internal
 * `ContentEditorKibanaProvider`. Supplying `features.contentEditor` populates
 * the base provider's `features.contentEditor.open`; `<Action.ContentEditor />`
 * self-skips when it isn't wired, so consumers render it unconditionally.
 *
 * @example
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   core={coreStart}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 *
 * @example With content editor
 * ```tsx
 * <ContentListClientProvider
 *   id="my-dashboards"
 *   labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
 *   findItems={myExistingFindItems}
 *   core={coreStart}
 *   services={{ savedObjectsTagging }}
 *   features={{ contentEditor: { onSave: handleSave } }}
 * >
 *   <MyContentList />
 * </ContentListClientProvider>
 * ```
 */
export declare const ContentListClientProvider: (props: ContentListClientProviderProps) => JSX.Element;
