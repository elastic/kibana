/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { Todo } from '../../common';

interface UseTodoFlyoutFormProps {
  editingTodo: Todo | null;
  onClose: () => void;
  onSave: (formData: Omit<Todo, 'id'>) => Promise<void>;
}

const getInitialFormState = (todo: Todo | null) => ({
  completed: todo?.completed || false,
  order: todo?.order ?? 0,
  priority: todo?.priority || 'Medium',
  title: todo?.title || '',
});

export const useTodoFlyoutForm = ({ editingTodo, onClose, onSave }: UseTodoFlyoutFormProps) => {
  const [formState, setFormState] = useState(getInitialFormState(editingTodo));
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);

  useEffect(() => {
    setFormState(getInitialFormState(editingTodo));
    setIsTitleInvalid(false);
  }, [editingTodo]);

  const handlePriorityChange = (selected: Array<{ value?: Todo['priority'] }>) => {
    setFormState((prev) => ({
      ...prev,
      priority: selected[0]?.value ?? 'Medium',
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      completed: e.target.checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await onSave(formState);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTitleInvalid) setIsTitleInvalid(false);
    setFormState((prev) => ({ ...prev, title: e.target.value }));
  };

  const validateForm = () => {
    const isInvalid = formState.title.trim() === '';
    setIsTitleInvalid(isInvalid);
    return !isInvalid;
  };

  return {
    formState,
    isLoading,
    isTitleInvalid,
    handlePriorityChange,
    handleStatusChange,
    handleSubmit,
    handleTitleChange,
  };
};
