import React from 'react';
import { type ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
/**
 * Props for {@link SavedObjectActivityRow}.
 */
export interface SavedObjectActivityRowProps {
    /**
     * Content-insights client for this listing's domain (typically built with
     * {@link createContentInsightsService}). Wrapped in a fresh
     * `ContentInsightsProvider` so the component works inside the content
     * editor flyout, which renders outside the listing's React tree.
     */
    service: ContentInsightsClientPublic;
    /**
     * The item being inspected. The row reads `createdBy`, `createdAt`,
     * `updatedBy`, `updatedAt`, and `managed` for the activity card and uses
     * `id` to fetch view stats.
     */
    item: UserContentCommonSchema;
    /** Plural entity label used by the activity card's "no creator/updater" tip. */
    entityNamePlural?: string;
}
/**
 * Activity row for the content editor flyout — renders the shared
 * `ActivityView` plus `ViewsStats` inside a `ContentInsightsProvider`.
 *
 * Drop into `contentEditor.appendRows`:
 *
 * ```tsx
 * contentEditor={{
 *   appendRows: (item) => (
 *     <SavedObjectActivityRow service={insights} item={item} entityNamePlural="dashboards" />
 *   ),
 * }}
 * ```
 *
 * Wraps a fresh provider on every mount because the flyout renders outside
 * the listing's tree, so we cannot rely on a parent provider being in scope.
 */
export declare const SavedObjectActivityRow: ({ service, item, entityNamePlural, }: SavedObjectActivityRowProps) => React.JSX.Element;
