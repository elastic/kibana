/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { DeleteConfirmModal } from './todo/delete_confirm_modal';
import { TodoAppHeader } from './todo/todo_app_header';
import { TodoEmptyPrompt } from './todo/todo_empty_prompt';
import { TodoFlyout } from './todo/todo_form_flyout';
import { TodoList } from './todo/todo_list';
import { useTodos } from '../hooks/use_todos';

interface AppProps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

export const App = ({ http, notifications }: AppProps) => {
  const {
    editingTodo,
    isConfirmModalOpen,
    isFlyoutOpen,
    isLoading,
    todos,
    todoToDelete,
    cancelDelete,
    closeFlyout,
    confirmDelete,
    handleOpenFlyout,
    handleSave,
    handleStatusChange,
    onDragEnd,
    openFlyoutWithTodo,
    requestDelete,
  } = useTodos({ http, notifications });

  return (
    <KibanaPageTemplate>
      <TodoAppHeader />
      <KibanaPageTemplate.Section alignment="center">
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : todos.length === 0 ? (
          <TodoEmptyPrompt onTodoAdd={handleOpenFlyout} />
        ) : (
          <TodoList
            onDelete={requestDelete}
            onDragEnd={onDragEnd}
            onEdit={openFlyoutWithTodo}
            onStatusChange={handleStatusChange}
            onTodoAdd={handleOpenFlyout}
            todos={todos}
          />
        )}
      </KibanaPageTemplate.Section>
      {isFlyoutOpen && (
        <TodoFlyout editingTodo={editingTodo} onClose={closeFlyout} onSave={handleSave} />
      )}
      {isConfirmModalOpen && todoToDelete && (
        <DeleteConfirmModal onCancel={cancelDelete} onConfirm={confirmDelete} todo={todoToDelete} />
      )}
    </KibanaPageTemplate>
  );
};
