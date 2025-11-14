/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { Todo } from '../../../common';

interface DeleteConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  todo: Todo;
}

const DELETE_MODAL_CANCEL = i18n.translate('todoExample.deleteModal.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

const DELETE_MODAL_CONFIRM = i18n.translate('todoExample.deleteModal.confirmButtonLabel', {
  defaultMessage: 'Delete',
});

const DELETE_MODAL_TITLE = i18n.translate('todoExample.deleteModal.title', {
  defaultMessage: 'Delete todo?',
});

export const DeleteConfirmModal = ({ todo, onCancel, onConfirm }: DeleteConfirmModalProps) => (
  <EuiConfirmModal
    aria-label={i18n.translate('todoExample.deleteModal.ariaLabel', {
      defaultMessage: 'Delete {taskTitle}?',
      values: { taskTitle: todo.title },
    })}
    buttonColor="danger"
    cancelButtonText={DELETE_MODAL_CANCEL}
    confirmButtonText={DELETE_MODAL_CONFIRM}
    defaultFocusedButton="confirm"
    onCancel={onCancel}
    onConfirm={onConfirm}
    title={DELETE_MODAL_TITLE}
  >
    <FormattedMessage
      defaultMessage="Are you sure you want to delete {taskTitle}?"
      id="todoExample.deleteModal.confirmationMessage"
      values={{
        taskTitle: <strong>{todo.title}</strong>,
      }}
    />
  </EuiConfirmModal>
);
