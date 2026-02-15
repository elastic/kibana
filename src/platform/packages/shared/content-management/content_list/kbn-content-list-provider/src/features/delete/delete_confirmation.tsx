/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListConfig } from '../../context';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Internal confirmation modal for delete operations.
 *
 * Reads `deleteRequest` and `isDeleting` from state. When confirmed, dispatches
 * `CONFIRM_DELETE_START`, calls `item.onDelete`, dispatches `DELETE_COMPLETED`,
 * and refetches items on success. On failure, dispatches `CANCEL_DELETE` to
 * dismiss the modal so the user can retry.
 *
 * Note: Selection clearing on success will be wired when the Selection PR merges.
 *
 * @internal Rendered by {@link LazyDeleteConfirmation} -- not exported publicly.
 */
export const DeleteConfirmation = () => {
  const { item, labels } = useContentListConfig();
  const { state, dispatch, refetch } = useContentListState();

  const { deleteRequest, isDeleting } = state;

  const handleCancel = useCallback(() => {
    dispatch({ type: CONTENT_LIST_ACTIONS.CANCEL_DELETE });
  }, [dispatch]);

  const handleConfirm = useCallback(async () => {
    if (!deleteRequest || !item?.onDelete || isDeleting) {
      return;
    }

    dispatch({ type: CONTENT_LIST_ACTIONS.CONFIRM_DELETE_START });

    try {
      await item.onDelete(deleteRequest.items);
      dispatch({ type: CONTENT_LIST_ACTIONS.DELETE_COMPLETED });
      refetch();
    } catch {
      // On failure, dismiss the modal so the user can retry.
      dispatch({ type: CONTENT_LIST_ACTIONS.CANCEL_DELETE });
    }
  }, [deleteRequest, item, dispatch, refetch, isDeleting]);

  const titleId = useGeneratedHtmlId({ prefix: 'contentListDeleteConfirmationTitle' });

  if (!deleteRequest) {
    return null;
  }

  const itemCount = deleteRequest.items.length;
  const entityName = itemCount === 1 ? labels.entity : labels.entityPlural;

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={i18n.translate('contentList.deleteConfirmation.title', {
        defaultMessage: 'Delete {itemCount} {entityName}?',
        values: { itemCount, entityName },
      })}
      titleProps={{ id: titleId }}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.translate('contentList.deleteConfirmation.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        isDeleting
          ? i18n.translate('contentList.deleteConfirmation.deleting', {
              defaultMessage: 'Deleting',
            })
          : i18n.translate('contentList.deleteConfirmation.confirm', {
              defaultMessage: 'Delete',
            })
      }
      defaultFocusedButton="cancel"
      buttonColor="danger"
      isLoading={isDeleting}
      data-test-subj="contentListDeleteConfirmation"
    >
      <p>
        {i18n.translate('contentList.deleteConfirmation.body', {
          defaultMessage: "You can't recover deleted {entityNamePlural}.",
          values: { entityNamePlural: labels.entityPlural },
        })}
      </p>
    </EuiConfirmModal>
  );
};
