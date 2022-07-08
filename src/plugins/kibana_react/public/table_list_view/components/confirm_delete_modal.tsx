/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props<T> {
  isDeletingItems: boolean;
  items: T[];
  entityName: string;
  entityNamePlural: string;
  onCancel: () => void;
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
      id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel"
      defaultMessage="Delete"
    />
  );

  if (isDeletingItems) {
    deleteButton = (
      <FormattedMessage
        id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.confirmButtonLabelDeleting"
        defaultMessage="Deleting"
      />
    );
  }

  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="kibana-react.tableListView.listing.deleteSelectedConfirmModal.title"
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
          id="kibana-react.tableListView.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={deleteButton}
      defaultFocusedButton="cancel"
    >
      <p>
        <FormattedMessage
          id="kibana-react.tableListView.listing.deleteConfirmModalDescription"
          defaultMessage="You can't recover deleted {entityNamePlural}."
          values={{ entityNamePlural }}
        />
      </p>
    </EuiConfirmModal>
  );
}
