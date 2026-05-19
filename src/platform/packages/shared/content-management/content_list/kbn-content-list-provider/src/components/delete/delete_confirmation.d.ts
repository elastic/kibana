import React from 'react';
import type { ContentListItem } from '../../item';
/**
 * Props for the connected {@link DeleteConfirmationModal}.
 */
export interface DeleteConfirmationModalProps {
    /** Items to delete. */
    items: ContentListItem[];
    /** Called when the modal should close (cancel or successful delete). */
    onClose: () => void;
}
/**
 * Connected confirmation modal for delete operations.
 *
 * Looks up the configured delete restriction, partitions the requested
 * `items`, and delegates rendering to {@link DeleteConfirmationComponent}.
 *
 * - When some items are restricted, a callout lists skipped items;
 *   confirming deletes only the permitted subset.
 * - When *every* item is restricted, flips to an informational layout.
 *
 * Calls `refetch` on successful delete and manages `isDeleting`/`error`
 * locally.
 *
 * @example
 * ```tsx
 * {showDeleteModal && (
 *   <DeleteConfirmationModal
 *     items={selectedItems}
 *     onClose={() => setShowDeleteModal(false)}
 *   />
 * )}
 * ```
 */
export declare const DeleteConfirmationModal: ({ items, onClose }: DeleteConfirmationModalProps) => React.JSX.Element;
