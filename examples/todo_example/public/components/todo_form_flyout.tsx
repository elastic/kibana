/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Todo } from '../../server/plugin';

interface TodoEditFlyoutProps {
  editingTodo: Todo | null;
  onClose: () => void;
  onSave: (formData: Omit<Todo, 'id'>) => void;
}

const COMPLETED_LABEL = i18n.translate('todoExample.todoFormFlyout.completedLabel', {
  defaultMessage: 'Completed',
});

const PRIORITY_HIGH_LABEL = i18n.translate('todoExample.todoFormFlyout.priorityHigh', {
  defaultMessage: '🔴 High',
});

const PRIORITY_LOW_LABEL = i18n.translate('todoExample.todoFormFlyout.priorityLow', {
  defaultMessage: '🟢 Low',
});

const PRIORITY_MEDIUM_LABEL = i18n.translate('todoExample.todoFormFlyout.priorityMedium', {
  defaultMessage: '🟠 Medium',
});

const TITLE_PLACEHOLDER = i18n.translate('todoExample.todoFormFlyout.titlePlaceholder', {
  defaultMessage: 'What do you need to do?',
});

const TITLE_REQUIRED_ERROR = i18n.translate('todoExample.todoFormFlyout.titleRequiredError', {
  defaultMessage: 'Title is required.',
});

const PRIORITY_OPTIONS: Array<EuiComboBoxOptionOption<Todo['priority']>> = [
  { label: PRIORITY_HIGH_LABEL, value: 'High' },
  { label: PRIORITY_MEDIUM_LABEL, value: 'Medium' },
  { label: PRIORITY_LOW_LABEL, value: 'Low' },
];

export const TodoFlyout = ({ editingTodo, onClose, onSave }: TodoEditFlyoutProps) => {
  const [formState, setFormState] = useState({
    completed: editingTodo?.completed || false,
    priority: editingTodo?.priority || 'Medium',
    title: editingTodo?.title || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);

  useEffect(() => {
    setFormState({
      completed: editingTodo?.completed || false,
      priority: editingTodo?.priority || 'Medium',
      title: editingTodo?.title || '',
    });
  }, [editingTodo]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    await onSave(formState);
    setIsLoading(false);

    onClose();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTitleInvalid) setIsTitleInvalid(false);

    setFormState({ ...formState, title: e.target.value });
  };

  const validateForm = () => {
    const isInvalid = formState.title.trim() === '';
    setIsTitleInvalid(isInvalid);
    return !isInvalid;
  };

  return (
    <EuiFlyout aria-labelledby="todoFlyoutTitle" onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="todoFlyoutTitle">
            {editingTodo ? (
              <FormattedMessage
                defaultMessage="Edit task"
                id="todoExample.todoFormFlyout.editTaskTitle"
              />
            ) : (
              <FormattedMessage
                defaultMessage="Create a new task"
                id="todoExample.todoFormFlyout.createTaskTitle"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" onSubmit={handleSubmit}>
          <EuiFormRow
            error={isTitleInvalid && TITLE_REQUIRED_ERROR}
            isInvalid={isTitleInvalid}
            label={
              <FormattedMessage defaultMessage="Title" id="todoExample.todoFormFlyout.titleLabel" />
            }
          >
            <EuiFieldText
              id="todoTitle"
              isInvalid={isTitleInvalid}
              onChange={handleTitleChange}
              placeholder={TITLE_PLACEHOLDER}
              value={formState.title}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                defaultMessage="Priority"
                id="todoExample.todoFormFlyout.priorityLabel"
              />
            }
          >
            <EuiComboBox
              id="todoPriority"
              isClearable={false}
              onChange={(selected) =>
                setFormState({
                  ...formState,
                  priority: selected[0]?.value ?? 'Medium',
                })
              }
              options={PRIORITY_OPTIONS}
              selectedOptions={[
                PRIORITY_OPTIONS.find(({ value }) => value === formState.priority) ||
                  PRIORITY_OPTIONS[1],
              ]}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                defaultMessage="Status"
                id="todoExample.todoFormFlyout.statusLabel"
              />
            }
          >
            <EuiCheckbox
              checked={formState.completed}
              id="todoComplete"
              label={COMPLETED_LABEL}
              onChange={(e) => setFormState({ ...formState, completed: e.target.checked })}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiButton fill fullWidth isLoading={isLoading} type="submit">
            {editingTodo ? (
              <FormattedMessage
                defaultMessage="Update Task"
                id="todoExample.todoFormFlyout.updateTaskButton"
              />
            ) : (
              <FormattedMessage
                defaultMessage="Create Task"
                id="todoExample.todoFormFlyout.createTaskButton"
              />
            )}
          </EuiButton>
        </EuiForm>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
