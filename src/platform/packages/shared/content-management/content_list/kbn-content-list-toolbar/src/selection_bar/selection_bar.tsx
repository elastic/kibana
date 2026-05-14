/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useContentListConfig,
  useContentListSelection,
  useDeleteConfirmation,
} from '@kbn/content-list-provider';

export interface SelectionBarProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Selection actions rendered as `toolsLeft` inside the `EuiSearchBar`.
 *
 * When items are selected and `actions.delete.onBulkAction` is
 * configured, renders a "Delete {count} {entity}" button.
 * Clicking opens a {@link DeleteConfirmationModal}.
 *
 * Bulk-action policy:
 * - The toolbar button is *never* disabled based on selected items.
 *   The dialog handles per-action partitioning.
 * - Row checkboxes auto-disable when no bulk action can act on the row.
 * - The confirm dialog partitions the request defensively.
 *
 * Returns `null` when nothing is selected or when
 * `actions.delete.onBulkAction` is not configured.
 *
 * @internal Rendered automatically by {@link ContentListToolbar}.
 */
export const SelectionBar = ({
  'data-test-subj': dataTestSubj = 'contentListSelectionBar',
}: SelectionBarProps) => {
  const { labels, item: itemConfig } = useContentListConfig();
  const { selectedItems, selectedCount, clearSelection } = useContentListSelection();
  const { requestDelete, deleteModal } = useDeleteConfirmation({ onClose: clearSelection });

  const buttonLabel = useMemo(
    () =>
      i18n.translate('contentManagement.contentList.toolbar.selectionBar.deleteButton', {
        defaultMessage: 'Delete {itemCount} {entityName}',
        values: {
          itemCount: selectedCount,
          entityName: selectedCount === 1 ? labels.entity : labels.entityPlural,
        },
      }),
    [selectedCount, labels.entity, labels.entityPlural]
  );

  if (selectedCount === 0 || typeof itemConfig?.actions?.delete?.onBulkAction !== 'function') {
    return null;
  }

  return (
    <>
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => requestDelete(selectedItems)}
        data-test-subj={`${dataTestSubj}-deleteButton`}
      >
        {buttonLabel}
      </EuiButton>
      {deleteModal}
    </>
  );
};
