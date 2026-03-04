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
 * When items are selected, renders a danger button labelled
 * "Delete {count} {entity}" matching the existing `TableListView` pattern.
 * Clicking the button opens a {@link DeleteConfirmationModal} that handles
 * the delete lifecycle (confirmation, loading, error, refetch).
 *
 * Returns `null` when nothing is selected.
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

  if (selectedCount === 0 || typeof itemConfig?.onDelete !== 'function') {
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
