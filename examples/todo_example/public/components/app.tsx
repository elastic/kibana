/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { TodoFlyout } from './todo_form_flyout';
import { TodoItem } from './todo_item';
import type { Todo } from '../../server/plugin';

interface AppProps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

const ADD_TASK_ERROR = i18n.translate('todoExample.notifications.addTaskErrorToastTitle', {
  defaultMessage: 'Failed to add task.',
});

const DELETE_MODAL_CANCEL = i18n.translate('todoExample.deleteModal.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

const DELETE_MODAL_CONFIRM = i18n.translate('todoExample.deleteModal.confirmButtonLabel', {
  defaultMessage: 'Delete',
});

const DELETE_MODAL_TITLE = i18n.translate('todoExample.deleteModal.title', {
  defaultMessage: 'Delete todo?',
});

const DELETE_TASK_ERROR = i18n.translate('todoExample.notifications.deleteTaskErrorToastTitle', {
  defaultMessage: 'Failed to delete task.',
});

const DELETE_TASK_SUCCESS = i18n.translate(
  'todoExample.notifications.deleteTaskSuccessToastTitle',
  {
    defaultMessage: 'Task was deleted successfully.',
  }
);

const FETCH_TASKS_ERROR = i18n.translate('todoExample.notifications.fetchTasksErrorToastTitle', {
  defaultMessage: 'Failed to fetch your tasks.',
});

const UPDATE_STATUS_ERROR = i18n.translate(
  'todoExample.notifications.updateStatusErrorToastTitle',
  {
    defaultMessage: 'Failed to update task status.',
  }
);

const UPDATE_TASK_ERROR = i18n.translate('todoExample.notifications.updateTaskErrorToastTitle', {
  defaultMessage: 'Failed to update task.',
});

export const App = ({ http, notifications }: AppProps) => {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const data = await http.get<Todo[]>('/api/todos');
        setTodos(data);
      } catch (error) {
        setTodos([]);
        notifications.toasts.addDanger({
          title: FETCH_TASKS_ERROR,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [http, notifications.toasts]);

  const cancelDelete = () => {
    setIsConfirmModalOpen(false);
    setTodoToDelete(null);
  };

  const closeFlyout = () => {
    setIsFlyoutOpen(false);
    setEditingTodo(null);
  };

  const confirmDelete = async () => {
    try {
      if (todoToDelete) {
        setTodos((prev) => prev.filter((t) => t.id !== todoToDelete.id));
        await http.delete(`/api/todos/${todoToDelete.id}`);
        notifications.toasts.addSuccess({
          title: DELETE_TASK_SUCCESS,
        });
      }
    } catch (error) {
      notifications.toasts.addDanger({
        title: DELETE_TASK_ERROR,
      });
    } finally {
      setIsConfirmModalOpen(false);
      setTodoToDelete(null);
    }
  };

  const handleSave = async (formState: Omit<Todo, 'id'>) => {
    try {
      let responseData: Todo | null = null;

      if (editingTodo) {
        responseData = await http.put(`/api/todos/${editingTodo.id}`, {
          body: JSON.stringify(formState),
        });
      } else {
        responseData = await http.post('/api/todos', {
          body: JSON.stringify(formState),
        });
      }

      if (!responseData) return;

      setTodos((prev) => {
        if (editingTodo) {
          return prev.map((t) => (t.id === editingTodo.id ? responseData! : t));
        }
        return [...prev, responseData!];
      });

      notifications.toasts.addSuccess({
        title: editingTodo
          ? i18n.translate('todoExample.notifications.updateTaskSuccessToastTitle', {
              defaultMessage: 'Task {taskTitle} was updated.',
              values: { taskTitle: responseData.title },
            })
          : i18n.translate('todoExample.notifications.addTaskSuccessToastTitle', {
              defaultMessage: 'Task {taskTitle} was added.',
              values: { taskTitle: responseData.title },
            }),
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: editingTodo ? UPDATE_TASK_ERROR : ADD_TASK_ERROR,
      });
    } finally {
      closeFlyout();
    }
  };

  const handleStatusChange = async (todo: Todo, completed: boolean) => {
    try {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed } : t)));

      await http.put(`/api/todos/${todo.id}`, {
        body: JSON.stringify({ completed }),
      });

      notifications.toasts.addSuccess({
        title: completed
          ? i18n.translate('todoExample.notifications.completeTaskSuccessToastTitle', {
              defaultMessage: 'Task {taskTitle} was completed.',
              values: { taskTitle: todo.title },
            })
          : i18n.translate('todoExample.notifications.reopenTaskSuccessToastTitle', {
              defaultMessage: 'Task {taskTitle} was reopened.',
              values: { taskTitle: todo.title },
            }),
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: UPDATE_STATUS_ERROR,
      });
    }
  };

  const openFlyoutWithTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsFlyoutOpen(true);
  };

  const requestDelete = (todo: Todo) => {
    setTodoToDelete(todo);
    setIsConfirmModalOpen(true);
  };

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header paddingSize="xl">
        <EuiTitle
          children={
            <h1>
              <FormattedMessage defaultMessage="My Todo List" id="todoExample.app.pageTitle" />
            </h1>
          }
        />
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section alignment="center">
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : todos.length === 0 ? (
          <EuiEmptyPrompt
            actions={
              <EuiButton color="primary" fill iconType="plus" onClick={() => setIsFlyoutOpen(true)}>
                <FormattedMessage
                  defaultMessage="Add your first task"
                  id="todoExample.emptyPrompt.addFirstTaskButtonLabel"
                />
              </EuiButton>
            }
            body={
              <EuiText size="m">
                <FormattedMessage
                  defaultMessage="Get started by creating your first task."
                  id="todoExample.emptyPrompt.body"
                />
              </EuiText>
            }
            iconType="notebookApp"
            title={
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    defaultMessage="Welcome to your Todo List"
                    id="todoExample.emptyPrompt.title"
                  />
                </h2>
              </EuiTitle>
            }
          />
        ) : (
          <EuiFlexGroup alignItems="center" direction="column" style={{ height: '70vh' }}>
            <EuiFlexItem grow={false} style={{ width: '100%' }}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" direction="row">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        defaultMessage="Your Tasks"
                        id="todoExample.tasksList.title"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconSize="m"
                    iconType="plus"
                    onClick={() => setIsFlyoutOpen(true)}
                  >
                    <FormattedMessage
                      defaultMessage="Add New Task"
                      id="todoExample.tasksList.addNewTaskButtonLabel"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={true} style={{ overflowY: 'auto', width: '100%' }}>
              <EuiListGroup maxWidth={800}>
                {todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    onDelete={requestDelete}
                    onEdit={openFlyoutWithTodo}
                    onStatusChange={handleStatusChange}
                    todo={todo}
                  />
                ))}
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </KibanaPageTemplate.Section>
      {isFlyoutOpen && (
        <TodoFlyout editingTodo={editingTodo} onClose={closeFlyout} onSave={handleSave} />
      )}
      {isConfirmModalOpen && todoToDelete && (
        <EuiConfirmModal
          aria-label={i18n.translate('todoExample.deleteModal.ariaLabel', {
            defaultMessage: 'Delete {taskTitle}?',
            values: { taskTitle: todoToDelete.title },
          })}
          buttonColor="danger"
          cancelButtonText={DELETE_MODAL_CANCEL}
          confirmButtonText={DELETE_MODAL_CONFIRM}
          defaultFocusedButton="confirm"
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          title={DELETE_MODAL_TITLE}
        >
          <FormattedMessage
            defaultMessage="Are you sure you want to delete {taskTitle}?"
            id="todoExample.deleteModal.confirmationMessage"
            values={{
              taskTitle: <strong>{todoToDelete.title}</strong>,
            }}
          />
        </EuiConfirmModal>
      )}
    </KibanaPageTemplate>
  );
};
