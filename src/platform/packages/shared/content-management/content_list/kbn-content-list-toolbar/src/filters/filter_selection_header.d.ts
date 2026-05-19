import React from 'react';
/**
 * Props for the {@link FilterSelectionHeader} component.
 */
export interface FilterSelectionHeaderProps {
    /** Number of active filter selections. */
    activeCount: number;
    /** Callback to clear all selections. */
    onClear: () => void;
    /** `data-test-subj` attribute for the clear button. */
    'data-test-subj'?: string;
}
/**
 * Displays the selection count and clear filter button.
 * Used in multi-select filter popovers.
 */
export declare const FilterSelectionHeader: ({ activeCount, onClear, "data-test-subj": dataTestSubj, }: FilterSelectionHeaderProps) => React.JSX.Element;
