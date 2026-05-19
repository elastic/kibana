import React from 'react';
/**
 * Props for the {@link FilterPopoverHeader} component.
 */
export interface FilterPopoverHeaderProps {
    /** Search element from `EuiSelectable`. */
    search?: React.ReactNode;
    /** Number of active filter selections. */
    activeCount: number;
    /** Callback to clear all selections. */
    onClear: () => void;
    /** `data-test-subj` attribute for the clear button. */
    'data-test-subj'?: string;
}
/**
 * Header section for filter popovers with search and selection controls.
 *
 * Includes:
 * - Optional search box (from `EuiSelectable`).
 * - "X selected" count.
 * - "Clear filter" button.
 *
 * @example
 * ```tsx
 * <EuiSelectable searchable>
 *   {(list, search) => (
 *     <>
 *       <FilterPopoverHeader
 *         search={search}
 *         activeCount={selectedCount}
 *         onClear={clearAll}
 *       />
 *       <EuiHorizontalRule margin="none" />
 *       {list}
 *     </>
 *   )}
 * </EuiSelectable>
 * ```
 */
export declare const FilterPopoverHeader: ({ search, activeCount, onClear, "data-test-subj": dataTestSubj, }: FilterPopoverHeaderProps) => React.JSX.Element;
