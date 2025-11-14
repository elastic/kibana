/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface TodoEmptyPromptProps {
  onTodoAdd: () => void;
}

export const TodoEmptyPrompt = ({ onTodoAdd }: TodoEmptyPromptProps) => (
  <EuiEmptyPrompt
    actions={
      <EuiButton color="primary" fill iconType="plus" onClick={onTodoAdd}>
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
);
