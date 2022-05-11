/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import {
  EuiText,
  EuiAvatar,
  EuiIcon,
  EuiFlexGrid,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { withEmbeddableSubscription } from '@kbn/embeddable-plugin/public';
import {
  MultiTaskTodoEmbeddable,
  MultiTaskTodoOutput,
  MultiTaskTodoInput,
} from './multi_task_todo_embeddable';

interface Props {
  embeddable: MultiTaskTodoEmbeddable;
  input: MultiTaskTodoInput;
  output: MultiTaskTodoOutput;
}

function wrapSearchTerms(task: string, search?: string) {
  if (!search) return task;
  const parts = task.split(new RegExp(`(${search})`, 'g'));
  return parts.map((part, i) =>
    part === search ? (
      <span key={i} style={{ backgroundColor: 'yellow' }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

function renderTasks(tasks: MultiTaskTodoInput['tasks'], search?: string) {
  return tasks.map((task) => (
    <EuiListGroupItem
      key={task}
      data-test-subj="multiTaskTodoTask"
      label={wrapSearchTerms(task, search)}
    />
  ));
}

export function MultiTaskTodoEmbeddableComponentInner({
  input: { title, icon, search, tasks },
}: Props) {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        {icon ? <EuiIcon type={icon} size="l" /> : <EuiAvatar name={title} size="l" />}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={1} gutterSize="none">
          <EuiFlexItem>
            <EuiText data-test-subj="multiTaskTodoTitle">
              <h3>{wrapSearchTerms(title, search)}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiListGroup bordered={true}>{renderTasks(tasks, search)}</EuiListGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const MultiTaskTodoEmbeddableComponent = withEmbeddableSubscription<
  MultiTaskTodoInput,
  MultiTaskTodoOutput,
  MultiTaskTodoEmbeddable
>(MultiTaskTodoEmbeddableComponentInner);
