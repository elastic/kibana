import React from 'react';
import type { ContentListItem } from '../../item';
import type { BulkActionSkippedItem } from '../../bulk_actions';
/**
 * Props for the presentational {@link DeleteConfirmationComponent}.
 *
 * The component receives a precomputed partition separating items into
 * `permitted` (will be deleted) and `skipped` (rejected by the restriction
 * predicate, with reasons).
 */
export interface DeleteConfirmationComponentProps {
    /** Items that will actually be deleted on confirm. */
    permitted: ContentListItem[];
    /** Items rejected by the delete restriction, with reasons. */
    skipped: BulkActionSkippedItem[];
    /** Singular entity name (e.g., "dashboard"). */
    entityName: string;
    /** Plural entity name (e.g., "dashboards"). */
    entityNamePlural: string;
    /** Whether a delete operation is currently executing. */
    isDeleting: boolean;
    /** Error message from the last failed attempt, displayed inline. */
    error?: string | null;
    /** Called when the user cancels (or closes the informational dialog). */
    onCancel: () => void;
    /** Called when the user confirms the delete. Never invoked in informational mode. */
    onConfirm: () => void;
}
/**
 * Stateless confirmation/explanation modal for delete operations.
 *
 * Renders one of two layouts:
 * - **Confirmable** (`permitted.length > 0`): `EuiConfirmModal` with a
 *   callout for any skipped items.
 * - **Informational** (`permitted.length === 0`): `EuiModal` explaining
 *   why no items can be deleted, with only a "Close" button.
 *
 * This dialog explains any partition that survives selection.
 * Use {@link DeleteConfirmationModal} for the connected version.
 */
export declare const DeleteConfirmationComponent: ({ permitted, skipped, entityName, entityNamePlural, isDeleting, error, onCancel, onConfirm, }: DeleteConfirmationComponentProps) => React.JSX.Element;
