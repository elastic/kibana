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
import { useContentListConfig, useContentListSelection } from '@kbn/content-list-provider';

export interface SelectionBarProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Selection actions rendered as `toolsLeft` inside the `EuiSearchBar`.
 *
 * When items are selected, renders a danger button labelled
 * "Delete {count} {entity}" matching the existing `TableListView` pattern.
 *
 * The button currently **clears the selection** as a placeholder action.
 * Delete orchestration will be wired in a follow-up PR that adds
 * provider-level delete support.
 *
 * Returns `null` when nothing is selected.
 *
 * @internal Rendered automatically by {@link ContentListToolbar}.
 */
export const SelectionBar = ({
  'data-test-subj': dataTestSubj = 'contentListSelectionBar',
}: SelectionBarProps) => {
  const { labels } = useContentListConfig();
  const { selectedCount, clearSelection } = useContentListSelection();

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

  if (selectedCount === 0) {
    return null;
  }

  return (
    <EuiButton
      color="danger"
      iconType="trash"
      // TODO: Wire to `useDeleteAction().requestDelete` once the delete orchestration PR lands.
      onClick={clearSelection}
      data-test-subj={`${dataTestSubj}-deleteButton`}
    >
      {buttonLabel}
    </EuiButton>
  );
};
