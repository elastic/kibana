/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function getI18nTexts(items: unknown[], entityName: string, entityNamePlural: string) {
  return {
    deleteBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel',
      {
        defaultMessage: 'Delete',
      }
    ),
    deletingBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabelDeleting',
      {
        defaultMessage: 'Deleting',
      }
    ),
    title: i18n.translate('contentManagement.tableList.listing.deleteSelectedConfirmModal.title', {
      defaultMessage: 'Delete {itemCount} {entityName}?',
      values: {
        itemCount: items.length,
        entityName: items.length === 1 ? entityName : entityNamePlural,
      },
    }),
    description: i18n.translate(
      'contentManagement.tableList.listing.deleteConfirmModalDescription',
      {
        defaultMessage: `You can't recover deleted {entityNamePlural}.`,
        values: {
          entityNamePlural,
        },
      }
    ),
    cancelBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
  };
}

interface Props<T> {
  /** Flag to indicate if the items are being deleted */
  isDeletingItems: boolean;
  /** Array of items to delete */
  items: T[];
  /** The name of the entity to delete (singular) */
  entityName: string;
  /** The name of the entity to delete (plural) */
  entityNamePlural: string;
  /** Handler to be called when clicking the "Cancel" button */
  onCancel: () => void;
  /** Handler to be called when clicking the "Confirm" button */
  onConfirm: () => void;
}

export function ConfirmDeleteModal<T>({
  isDeletingItems,
  items,
  entityName,
  entityNamePlural,
  onCancel,
  onConfirm,
}: Props<T>) {
  const { deleteBtnLabel, deletingBtnLabel, title, description, cancelBtnLabel } = useMemo(
    () => getI18nTexts(items, entityName, entityNamePlural),
    [entityName, entityNamePlural, items]
  );

  return (
    <EuiConfirmModal
      title={title}
      buttonColor="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelBtnLabel}
      confirmButtonText={isDeletingItems ? deletingBtnLabel : deleteBtnLabel}
      defaultFocusedButton="cancel"
    >
      <p>{description}</p>
    </EuiConfirmModal>
  );
}
