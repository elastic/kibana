/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface TodoActionsProps {
  onDelete: () => void;
  onEdit: () => void;
  todoTitle: string;
}

const todoActionsContainerStyles = css`
  flex: none;
  flex-shrink: 0;
  min-width: auto;
`;

const DELETE_TOOLTIP = i18n.translate('todoExample.todoActions.deleteTooltip', {
  defaultMessage: 'Delete task',
});

const EDIT_TOOLTIP = i18n.translate('todoExample.todoActions.editTooltip', {
  defaultMessage: 'Edit task',
});

export const TodoActions = ({ todoTitle, onEdit, onDelete }: TodoActionsProps) => {
  const deleteAriaLabel = i18n.translate('todoExample.todoActions.deleteAriaLabel', {
    defaultMessage: 'Delete {taskTitle} task',
    values: { taskTitle: todoTitle },
  });

  const editAriaLabel = i18n.translate('todoExample.todoActions.editAriaLabel', {
    defaultMessage: 'Edit {taskTitle} task',
    values: { taskTitle: todoTitle },
  });

  return (
    <EuiFlexGroup
      alignItems="center"
      css={todoActionsContainerStyles}
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={EDIT_TOOLTIP}>
          <EuiButtonIcon aria-label={editAriaLabel} iconType="pencil" onClick={onEdit} size="s" />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={DELETE_TOOLTIP}>
          <EuiButtonIcon
            aria-label={deleteAriaLabel}
            color="danger"
            iconType="trash"
            onClick={onDelete}
            size="s"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
