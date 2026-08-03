import React from 'react';
import type { ResolvedColumn } from '../hooks/use_columns';
export declare const MAX_SKELETON_ROW_COUNT = 20;
/**
 * Props for {@link TableSkeleton}.
 */
export interface TableSkeletonProps {
    /** Resolved columns and their skeleton descriptors. */
    columns: ResolvedColumn[];
    /** Whether to prepend the selection checkbox column. */
    hasSelection: boolean;
    /**
     * Desired body row count. Clamped to `1..MAX_SKELETON_ROW_COUNT` so the
     * skeleton tracks page size without creating huge loading placeholders.
     */
    rowCount?: number;
    /** Matches the real table layout. */
    tableLayout: 'fixed' | 'auto';
    /** Matches the real table density. */
    compressed: boolean;
    'data-test-subj'?: string;
}
/**
 * Column-aware loading skeleton shown while the initial table fetch is in
 * flight. Cell shapes come from preset/custom descriptors or column metadata.
 */
export declare const TableSkeleton: ({ columns, hasSelection, rowCount, tableLayout, compressed, "data-test-subj": dataTestSubj, }: TableSkeletonProps) => React.JSX.Element;
