/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DropResult } from '@hello-pangea/dnd';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';
import type { Todo } from '../../common';

const ADD_TASK_ERROR = i18n.translate('todoExample.notifications.addTaskErrorToastTitle', {
  defaultMessage: '❌ Failed to add task.',
});

const DELETE_TASK_ERROR = i18n.translate('todoExample.notifications.deleteTaskErrorToastTitle', {
  defaultMessage: '🗑️ Failed to delete task.',
});

const DELETE_TASK_SUCCESS = i18n.translate(
  'todoExample.notifications.deleteTaskSuccessToastTitle',
  {
    defaultMessage: '🗑️ Task was deleted successfully!',
  }
);

const FETCH_TASKS_ERROR = i18n.translate('todoExample.notifications.fetchTasksErrorToastTitle', {
  defaultMessage: '⚠️ Failed to fetch your tasks.',
});

const REORDER_TASKS_ERROR = i18n.translate('todoExample.notifications.reorderError', {
  defaultMessage: '⚠️ Failed to save new task order.',
});

const UPDATE_STATUS_ERROR = i18n.translate(
  'todoExample.notifications.updateStatusErrorToastTitle',
  {
    defaultMessage: '⚠️ Failed to update task status.',
  }
);

const UPDATE_TASK_ERROR = i18n.translate('todoExample.notifications.updateTaskErrorToastTitle', {
  defaultMessage: '❌ Failed to update task.',
});

interface UseTodosDeps {
  http: HttpSetup;
  notifications: NotificationsSetup;
}

export const useTodos = ({ http, notifications }: UseTodosDeps) => {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const data = await http.get<Todo[]>('/api/todos');
        setTodos(data);
      } catch (error: any) {
        setTodos([]);

        notifications.toasts.addDanger({
          title: FETCH_TASKS_ERROR,
          ...(error?.body?.message && { text: error.body.message }),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [http, notifications.toasts]);

  const cancelDelete = useCallback(() => {
    setIsConfirmModalOpen(false);
    setTodoToDelete(null);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setEditingTodo(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      if (todoToDelete) {
        setTodos((prev) => prev.filter((t) => t.id !== todoToDelete.id));

        await http.delete(`/api/todos/${todoToDelete.id}`);

        notifications.toasts.addSuccess({
          title: DELETE_TASK_SUCCESS,
        });
      }
    } catch (error) {
      if (todoToDelete) setTodos((prev) => [...prev, todoToDelete]);

      notifications.toasts.addDanger({
        title: DELETE_TASK_ERROR,
        ...(error?.body?.message && { text: error.body.message }),
      });
    } finally {
      setIsConfirmModalOpen(false);
      setTodoToDelete(null);
    }
  }, [http, notifications.toasts, todoToDelete]);

  const handleOpenFlyout = useCallback(() => setIsFlyoutOpen(true), []);

  const handleSave = useCallback(
    async (formState: Omit<Todo, 'id'>) => {
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
          if (editingTodo) return prev.map((t) => (t.id === editingTodo.id ? responseData! : t));

          return [...prev, responseData!];
        });

        notifications.toasts.addSuccess({
          title: editingTodo
            ? i18n.translate('todoExample.notifications.updateTaskSuccessToastTitle', {
                defaultMessage: '✅ Task {taskTitle} was updated!',
                values: { taskTitle: responseData.title },
              })
            : i18n.translate('todoExample.notifications.addTaskSuccessToastTitle', {
                defaultMessage: '🎉 Task {taskTitle} was added!',
                values: { taskTitle: responseData.title },
              }),
        });
      } catch (error) {
        notifications.toasts.addDanger({
          title: editingTodo ? UPDATE_TASK_ERROR : ADD_TASK_ERROR,
          ...(error?.body?.message && { text: error.body.message }),
        });
      } finally {
        closeFlyout();
      }
    },
    [editingTodo, http, notifications.toasts, closeFlyout]
  );

  const handleStatusChange = useCallback(
    async (todo: Todo, completed: boolean) => {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed } : t)));

      try {
        await http.put(`/api/todos/${todo.id}`, {
          body: JSON.stringify({ completed }),
        });

        notifications.toasts.addSuccess({
          title: completed
            ? i18n.translate('todoExample.notifications.completeTaskSuccessToastTitle', {
                defaultMessage: '🎉 Task {taskTitle} was completed!',
                values: { taskTitle: todo.title },
              })
            : i18n.translate('todoExample.notifications.reopenTaskSuccessToastTitle', {
                defaultMessage: '🔄 Task {taskTitle} was reopened!',
                values: { taskTitle: todo.title },
              }),
        });
      } catch (error) {
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, completed: !completed } : t))
        );

        notifications.toasts.addDanger({
          title: UPDATE_STATUS_ERROR,
          ...(error?.body?.message && { text: error.body.message }),
        });
      }
    },
    [http, notifications.toasts]
  );

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination } = result;

      if (!destination) return;
      // euiDragDropReorder is imported from EUI
      // @ts-ignore
      const { euiDragDropReorder } = await import('@elastic/eui');

      const items = euiDragDropReorder(todos, source.index, destination.index);
      const reordered = items.map((item: Todo, idx: number) => ({ ...item, order: idx }));

      setTodos(reordered);

      const reorderPayload = {
        order: reordered.map(({ id, order }) => ({ id, order })),
      };
      try {
        await http.post('/api/todos/reorder', {
          body: JSON.stringify(reorderPayload),
        });
      } catch (error) {
        notifications.toasts.addDanger({
          title: REORDER_TASKS_ERROR,
          ...(error?.body?.message && { text: error.body.message }),
        });
      }
    },
    [todos, http, notifications.toasts]
  );

  const openFlyoutWithTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setIsFlyoutOpen(true);
  }, []);

  const requestDelete = useCallback((todo: Todo) => {
    setTodoToDelete(todo);
    setIsConfirmModalOpen(true);
  }, []);

  return {
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
  };
};
