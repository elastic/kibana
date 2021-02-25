/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal } from '@elastic/eui';

import { ScriptedFieldItem } from '../../types';

interface DeleteScritpedFieldConfirmationModalProps {
  field: ScriptedFieldItem;
  hideDeleteConfirmationModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  deleteField: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const DeleteScritpedFieldConfirmationModal = ({
  field,
  hideDeleteConfirmationModal,
  deleteField,
}: DeleteScritpedFieldConfirmationModalProps) => {
  const title = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteFieldLabel',
    {
      defaultMessage: "Delete scripted field '{fieldName}'?",
      values: { fieldName: field.name },
    }
  );
  const cancelButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.cancelButton',
    { defaultMessage: 'Cancel' }
  );
  const confirmButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.deleteButton',
    { defaultMessage: 'Delete' }
  );

  return (
    <EuiConfirmModal
      title={title}
      onCancel={hideDeleteConfirmationModal}
      onConfirm={deleteField}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
    />
  );
};
