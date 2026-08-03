import React from 'react';
import type { ReactNode } from 'react';
import type { EuiBreakpointSize } from '@elastic/eui';
import { type ContentListItem } from '@kbn/content-list-provider';
/**
 * Props for ContentListTable component.
 */
export interface ContentListTableProps {
    /** Accessible title for the table (used as table caption for screen readers). */
    title: string;
    /** Table layout mode. */
    tableLayout?: 'fixed' | 'auto';
    /** Compressed table style. */
    compressed?: boolean;
    /**
     * Whether to enable horizontal scrolling when columns exceed the container width.
     * Required for sticky columns (e.g. `Column.Actions` with `sticky: true`).
     *
     * @default true
     */
    scrollableInline?: boolean;
    /**
     * Named breakpoint below which the table collapses into responsive cards.
     * Set to `false` to always render as a table, or `true` to always render cards.
     *
     * Content List defaults to `false` because the card layout does not support
     * selection checkboxes, tag badges, star buttons, or action columns.
     *
     * @default false
     */
    responsiveBreakpoint?: EuiBreakpointSize | boolean;
    /**
     * Custom message to display when a search or filter returns zero results.
     * When omitted, renders a default "No items found" with
     * `data-test-subj="contentListNoResults"` (matches {@link ContentListWrapper}).
     * Has no effect when the whole list is empty; `<ContentList>` owns that state.
     */
    noItemsMessage?: ReactNode;
    /**
     * Column components as children.
     * If no children provided, defaults to Name column.
     */
    children?: ReactNode;
    /**
     * Optional filter function to filter items from the provider.
     * Useful when multiple tables share a single provider but display different subsets.
     *
     * **Important:** This function should be memoized (e.g., with `useCallback`) to prevent
     * unnecessary re-filtering on every render.
     *
     * @example
     * ```tsx
     * const filter = useCallback(
     *   (item: ContentListItem) => item.type === 'dashboard',
     *   []
     * );
     * <ContentListTable filter={filter} />
     * ```
     */
    filter?: (item: ContentListItem) => boolean;
    /** Test subject for testing. */
    'data-test-subj'?: string;
}
/**
 * Get a stable row ID for EuiBasicTable's `itemId` prop.
 *
 * @param id - The item's ID.
 * @returns A stable row ID string.
 */
export declare const getRowId: (id: string) => string;
export declare const Column: React.FC<import("@kbn/content-list").ColumnProps> & {
    Name: React.FC<import("@kbn/content-list").NameColumnProps>;
    UpdatedAt: React.FC<import("@kbn/content-list").UpdatedAtColumnProps>;
    Actions: React.FC<import("@kbn/content-list").ActionsColumnProps>;
    Starred: React.FC<import("@kbn/content-list").StarredColumnProps>;
    CreatedBy: React.FC<import("@kbn/content-list").CreatedByColumnProps>;
};
export declare const Action: React.FC<import("@kbn/content-list").ActionProps> & {
    Edit: React.FC<import("@kbn/content-list").EditActionProps>;
    Delete: React.FC<import("@kbn/content-list").DeleteActionProps>;
    ContentEditor: React.FC<import("@kbn/content-list").ContentEditorActionProps>;
};
export declare const ContentListTable: (({ title, tableLayout, compressed, scrollableInline, responsiveBreakpoint, noItemsMessage, children, filter, "data-test-subj": dataTestSubj, }: ContentListTableProps) => React.JSX.Element | null) & {
    Column: React.FC<import("@kbn/content-list").ColumnProps> & {
        Name: React.FC<import("@kbn/content-list").NameColumnProps>;
        UpdatedAt: React.FC<import("@kbn/content-list").UpdatedAtColumnProps>;
        Actions: React.FC<import("@kbn/content-list").ActionsColumnProps>;
        Starred: React.FC<import("@kbn/content-list").StarredColumnProps>;
        CreatedBy: React.FC<import("@kbn/content-list").CreatedByColumnProps>;
    };
    Action: React.FC<import("@kbn/content-list").ActionProps> & {
        Edit: React.FC<import("@kbn/content-list").EditActionProps>;
        Delete: React.FC<import("@kbn/content-list").DeleteActionProps>;
        ContentEditor: React.FC<import("@kbn/content-list").ContentEditorActionProps>;
    };
};
