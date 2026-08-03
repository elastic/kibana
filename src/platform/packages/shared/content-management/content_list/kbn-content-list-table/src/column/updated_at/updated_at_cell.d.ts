import React from 'react';
export interface UpdatedAtCellProps {
    /** The `updatedAt` value from the content list item. */
    updatedAt?: Date;
}
/**
 * Cell renderer for the `UpdatedAt` column.
 *
 * Displays the last updated timestamp with the following formatting:
 * - Within the last 7 days: locale-aware relative time via `FormattedRelative`
 *   from `@kbn/i18n-react` (e.g., "2 hours ago"). Auto-updates as time passes.
 * - Older than 7 days: abbreviated absolute date (e.g., "Jan 5, 2025").
 * - Missing value: dash with tooltip "Last updated unknown".
 *
 * A tooltip always shows the full date and time (e.g., "January 5, 2025 3:42 PM").
 *
 * Memoized to prevent unnecessary re-renders when parent table re-renders.
 */
export declare const UpdatedAtCell: React.MemoExoticComponent<({ updatedAt }: UpdatedAtCellProps) => React.JSX.Element>;
