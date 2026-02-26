/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useContentListConfig } from '../../context';
import { useContentListState } from '../../state/use_content_list_state';
import { DeleteConfirmationComponent } from './delete_confirmation.component';
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
 * Reads `item.onDelete` and entity labels from the provider config, calls
 * `refetch` on success, and manages `isDeleting`/`error` locally.
 * Delegates rendering to {@link DeleteConfirmationComponent}.
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
export const DeleteConfirmationModal = ({ items, onClose }: DeleteConfirmationModalProps) => {
  const { labels, item: itemConfig } = useContentListConfig();
  const { refetch } = useContentListState();

  const deletingRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = useCallback(async () => {
    if (!itemConfig?.onDelete || deletingRef.current) {
      return;
    }

    deletingRef.current = true;
    setIsDeleting(true);
    setError(null);

    try {
      await itemConfig.onDelete(items);
      refetch();
      onClose();
    } catch (e) {
      deletingRef.current = false;
      setIsDeleting(false);
      setError(
        e instanceof Error
          ? e.message
          : i18n.translate('contentManagement.contentList.deleteConfirmation.unknownError', {
              defaultMessage:
                'The {entityNamePlural} could not be deleted. Check the Kibana server logs or try again.',
              values: { entityNamePlural: labels.entityPlural },
            })
      );
    }
  }, [itemConfig, items, labels.entityPlural, refetch, onClose]);

  return (
    <DeleteConfirmationComponent
      {...{ items, isDeleting, error }}
      entityName={labels.entity}
      entityNamePlural={labels.entityPlural}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
};
