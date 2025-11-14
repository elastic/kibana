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
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroupItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type { Todo } from '../../../common';
import { TodoActions } from './todo_actions';

interface TodoItemProps {
  dndProvided: DraggableProvided;
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onStatusChange: (todo: Todo, completed: boolean) => void;
  todo: Todo;
}

export const TodoItem = ({
  dndProvided,
  onDelete,
  onEdit,
  onStatusChange,
  todo,
}: TodoItemProps) => {
  const { euiTheme } = useEuiTheme();

  const handleCheckboxChange = () => onStatusChange(todo, !todo.completed);

  const priorityColor =
    todo.priority === 'High'
      ? euiTheme.colors.danger
      : todo.priority === 'Medium'
      ? euiTheme.colors.warning
      : euiTheme.colors.success;

  const priorityDotStyles = css`
    background-color: ${priorityColor};
    border-radius: 50%;
    display: block;
    height: ${euiTheme.size.m};
    width: ${euiTheme.size.m};
  `;

  const titleStyles = css`
    display: block;
    overflow: hidden;
    text-decoration: ${todo.completed ? 'line-through' : 'none'};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const checkboxAriaLabel = i18n.translate('todoExample.todoItem.checkboxAriaLabel', {
    defaultMessage: 'Mark {taskTitle} as {status}',
    values: {
      taskTitle: todo.title,
      status: todo.completed
        ? i18n.translate('todoExample.todoItem.incomplete', { defaultMessage: 'incomplete' })
        : i18n.translate('todoExample.todoItem.complete', { defaultMessage: 'complete' }),
    },
  });

  const priorityTooltip = i18n.translate('todoExample.todoItem.priorityTooltip', {
    defaultMessage: 'Priority: {priority}',
    values: { priority: todo.priority },
  });

  return (
    <EuiListGroupItem
      color={todo.completed ? 'primary' : 'text'}
      key={todo.id}
      label={
        <EuiPanel
          borderRadius="m"
          color={todo.completed ? 'subdued' : 'plain'}
          css={css`
            width: 300px;
            @media (min-width: 600px) {
              width: 400px;
            }
          `}
          hasBorder
          hasShadow
          paddingSize="m"
        >
          <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem
                  color="transparent"
                  grow={false}
                  paddingSize="s"
                  {...dndProvided.dragHandleProps}
                  aria-label="Drag Handle"
                >
                  <EuiIcon type="grab" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    aria-label={checkboxAriaLabel}
                    checked={todo.completed}
                    id={`todo-checkbox-${todo.id}`}
                    onChange={handleCheckboxChange}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={priorityTooltip} delay="regular">
                    <span aria-label={priorityTooltip} css={priorityDotStyles} />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText css={titleStyles}>{todo.title}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TodoActions
                onDelete={() => onDelete(todo)}
                onEdit={() => onEdit(todo)}
                todoTitle={todo.title}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      }
      size="l"
    />
  );
};
