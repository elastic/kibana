import React from 'react';
/**
 * Props for {@link ToolbarSkeleton}.
 */
export interface ToolbarSkeletonProps {
    /** Number of filter-button placeholders to render to the right of the search input. */
    filterCount: number;
    /** When `true`, prepends a narrow checkbox placeholder matching the real selection UI. */
    hasSelection: boolean;
    /** Optional `data-test-subj`. */
    'data-test-subj'?: string;
}
/**
 * Loading-state placeholder for `ContentListToolbar`.
 *
 * Mirrors the real toolbar's horizontal layout: an optional selection
 * checkbox, a full-width search input, and one rectangle per configured
 * filter button. All cells share the same row height so the swap to the
 * real toolbar produces no vertical shift.
 */
export declare const ToolbarSkeleton: ({ filterCount, hasSelection, "data-test-subj": dataTestSubj, }: ToolbarSkeletonProps) => React.JSX.Element;
