/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { EuiText } from '@elastic/eui';
import { EuiAvatar } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { withEmbeddableSubscription } from '../../../../src/plugins/embeddable/public';
import { TodoRefInput, TodoRefOutput, TodoRefEmbeddable } from './todo_ref_embeddable';

interface Props {
  embeddable: TodoRefEmbeddable;
  input: TodoRefInput;
  output: TodoRefOutput;
}

function wrapSearchTerms(task?: string, search?: string) {
  if (!search) return task;
  if (!task) return task;
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

export function TodoRefEmbeddableComponentInner({
  input: { search },
  output: { savedAttributes },
}: Props) {
  const icon = savedAttributes?.icon;
  const title = savedAttributes?.title;
  const task = savedAttributes?.task;
  return (
    <EuiFlexGroup data-render-complete="true">
      <EuiFlexItem grow={false}>
        {icon ? (
          <EuiIcon type={icon} size="l" />
        ) : (
          <EuiAvatar name={title || task || ''} size="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={1}>
          <EuiFlexItem>
            <EuiText data-test-subj="todoEmbeddableTitle">
              <h3>{wrapSearchTerms(title || '', search)}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText data-test-subj="todoEmbeddableTask">{wrapSearchTerms(task, search)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const TodoRefEmbeddableComponent = withEmbeddableSubscription<
  TodoRefInput,
  TodoRefOutput,
  TodoRefEmbeddable
>(TodoRefEmbeddableComponentInner);
