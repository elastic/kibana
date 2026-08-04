import React from 'react';
export interface SelectionBarProps {
    /** Optional `data-test-subj` attribute for testing. */
    'data-test-subj'?: string;
}
/**
 * Selection actions rendered as `toolsLeft` inside the `EuiSearchBar`.
 *
 * When items are selected and `actions.delete.onBulkAction` is
 * configured, renders a "Delete {count} {entity}" button. The count
 * matches what the modal will actually delete: it partitions the
 * selection by `actions.delete.restriction` and labels the button with
 * the deletable subset. Clicking opens a {@link DeleteConfirmationModal}
 * which surfaces any skipped items.
 *
 * Returns `null` when nothing is selected or when
 * `actions.delete.onBulkAction` is not configured.
 *
 * @internal Rendered automatically by {@link ContentListToolbar}.
 */
export declare const SelectionBar: ({ "data-test-subj": dataTestSubj, }: SelectionBarProps) => React.JSX.Element | null;
