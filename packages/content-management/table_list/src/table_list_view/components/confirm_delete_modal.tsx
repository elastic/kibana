/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint react-hooks/exhaustive-deps: 2 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
  let deleteButton = (
    <FormattedMessage
      id="contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel"
      defaultMessage="Delete"
    />
  );

  if (isDeletingItems) {
    deleteButton = (
      <FormattedMessage
        id="contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabelDeleting"
        defaultMessage="Deleting"
      />
    );
  }

  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteSelectedConfirmModal.title"
          defaultMessage="Delete {itemCount} {entityName}?"
          values={{
            itemCount: items.length,
            entityName: items.length === 1 ? entityName : entityNamePlural,
          }}
        />
      }
      buttonColor="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={deleteButton}
      defaultFocusedButton="cancel"
    >
      <p>
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteConfirmModalDescription"
          defaultMessage="You can't recover deleted {entityNamePlural}."
          values={{ entityNamePlural }}
        />
      </p>
    </EuiConfirmModal>
  );
}
