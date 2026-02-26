/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ContentListItem } from '../../item/types';
import { DeleteConfirmationModal } from './delete_confirmation';

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
 * Consumers call `requestDelete(items)` to open the modal and render
 * `deleteModal` in their JSX. The modal handles confirmation, deletion
 * (via the provider's `onDelete`), loading, and error display internally.
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
export const useDeleteConfirmation = (
  options?: UseDeleteConfirmationOptions
): UseDeleteConfirmationReturn => {
  const { onClose: onCloseCallback } = options ?? {};
  const [items, setItems] = useState<ContentListItem[] | null>(null);

  const requestDelete = useCallback((toDelete: ContentListItem[]) => setItems(toDelete), []);

  const close = useCallback(() => {
    setItems(null);
    onCloseCallback?.();
  }, [onCloseCallback]);

  const deleteModal = items ? <DeleteConfirmationModal {...{ items }} onClose={close} /> : null;

  return { requestDelete, deleteModal };
};
