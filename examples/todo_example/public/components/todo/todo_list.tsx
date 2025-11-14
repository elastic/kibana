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
  DropResult,
  EuiButton,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TodoItem } from './todo_item';
import type { Todo } from '../../../common';

interface TodoListProps {
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onDragEnd: (result: DropResult) => void;
  onStatusChange: (todo: Todo, completed: boolean) => void;
  onTodoAdd: () => void;
  todos: Todo[];
}

export const TodoList = ({
  onDelete,
  onDragEnd,
  onEdit,
  onStatusChange,
  onTodoAdd,
  todos = [],
}: TodoListProps) => (
  <EuiFlexGroup
    alignItems="center"
    css={css`
      height: 70vh;
    `}
    direction="column"
  >
    <EuiFlexItem
      grow={false}
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexGroup alignItems="center" direction="row" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage defaultMessage="Your Tasks" id="todoExample.tasksList.title" />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconSize="m" iconType="plus" onClick={onTodoAdd}>
            <FormattedMessage
              defaultMessage="Add New Task"
              id="todoExample.tasksList.addNewTaskButtonLabel"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem
      grow={true}
      css={css`
        overflow-y: auto;
        width: 100%;
      `}
    >
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="s">
          <EuiListGroup gutterSize="none" maxWidth={600}>
            {todos.map((todo, idx) => (
              <EuiDraggable
                customDragHandle={true}
                draggableId={todo.id}
                hasInteractiveChildren={true}
                index={idx}
                key={todo.id}
                spacing="s"
              >
                {(provided) => (
                  <TodoItem
                    dndProvided={provided}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                    todo={todo}
                  />
                )}
              </EuiDraggable>
            ))}
          </EuiListGroup>
        </EuiDroppable>
      </EuiDragDropContext>
    </EuiFlexItem>
  </EuiFlexGroup>
);
