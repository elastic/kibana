/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiConfirmModal, EuiCallOut, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '../../item';

/**
 * Props for the presentational {@link DeleteConfirmationComponent}.
 */
export interface DeleteConfirmationComponentProps {
  /** Items being deleted. */
  items: ContentListItem[];
  /** Singular entity name (e.g., "dashboard"). */
  entityName: string;
  /** Plural entity name (e.g., "dashboards"). */
  entityNamePlural: string;
  /** Whether a delete operation is currently executing. */
  isDeleting: boolean;
  /** Error message from the last failed attempt, displayed inline. */
  error?: string | null;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Called when the user confirms. */
  onConfirm: () => void;
}

/**
 * Presentational confirmation modal for delete operations.
 *
 * Stateless — all data and callbacks are provided via props.
 * Use {@link DeleteConfirmationModal} for the connected version that
 * reads from content list context.
 */
export const DeleteConfirmationComponent = ({
  items,
  entityName,
  entityNamePlural,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmationComponentProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'contentListDeleteConfirmationTitle' });
  const itemCount = items.length;
  const displayEntityName = itemCount === 1 ? entityName : entityNamePlural;

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={i18n.translate('contentManagement.contentList.deleteConfirmation.title', {
        defaultMessage: 'Delete {itemCount} {displayEntityName}?',
        values: { itemCount, displayEntityName },
      })}
      titleProps={{ id: titleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('contentManagement.contentList.deleteConfirmation.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        isDeleting
          ? i18n.translate('contentManagement.contentList.deleteConfirmation.deleting', {
              defaultMessage: 'Deleting',
            })
          : i18n.translate('contentManagement.contentList.deleteConfirmation.confirm', {
              defaultMessage: 'Delete',
            })
      }
      defaultFocusedButton="cancel"
      buttonColor="danger"
      isLoading={isDeleting}
      data-test-subj="contentListDeleteConfirmation"
    >
      <p>
        {i18n.translate('contentManagement.contentList.deleteConfirmation.body', {
          defaultMessage: "You can't recover deleted {entityNamePlural}.",
          values: { entityNamePlural },
        })}
      </p>
      {error && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            title={i18n.translate('contentManagement.contentList.deleteConfirmation.error', {
              defaultMessage: 'Unable to delete {entityNamePlural}',
              values: { entityNamePlural },
            })}
            data-test-subj="contentListDeleteError"
          >
            <p>{error}</p>
          </EuiCallOut>
        </>
      )}
    </EuiConfirmModal>
  );
};
