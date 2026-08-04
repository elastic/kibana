import type { ReactNode } from 'react';
import type { ContentListItem } from '../../item/types';
/**
 * Options for {@link useDeleteConfirmation}.
 */
export interface UseDeleteConfirmationOptions {
    /**
     * Called after the modal closes (cancel or successful delete).
     * Use for side effects like clearing selection state.
     */
    onClose?: () => void;
}
/**
 * Return value of {@link useDeleteConfirmation}.
 */
export interface UseDeleteConfirmationReturn {
    /** Trigger the delete confirmation modal for the given items. */
    requestDelete: (items: ContentListItem[]) => void;
    /** The modal element to render, or `null` when inactive. */
    deleteModal: ReactNode;
}
/**
 * Encapsulates the open/close state for a {@link DeleteConfirmationModal}.
 *
 * Consumers call `requestDelete(items)` and render `deleteModal` in their JSX.
 * The modal partitions items into deletable and non-deletable subsets using
 * `actions.delete.restriction`, shows the partition to the user, and invokes
 * `actions.delete.onBulkAction` on the deletable subset.
 *
 * The partition acts as a defensive backstop for programmatic selection or
 * multi-action scenarios where a row is selectable but not deletable.
 *
 * @example Row-level delete (table)
 * ```tsx
 * const { requestDelete, deleteModal } = useDeleteConfirmation();
 * // pass requestDelete to action builder context
 * return <>{table}{deleteModal}</>;
 * ```
 *
 * @example Bulk delete (toolbar selection bar)
 * ```tsx
 * const { requestDelete, deleteModal } = useDeleteConfirmation({
 *   onClose: clearSelection,
 * });
 * return (
 *   <>
 *     <EuiButton onClick={() => requestDelete(selectedItems)}>Delete</EuiButton>
 *     {deleteModal}
 *   </>
 * );
 * ```
 */
export declare const useDeleteConfirmation: (options?: UseDeleteConfirmationOptions) => UseDeleteConfirmationReturn;
