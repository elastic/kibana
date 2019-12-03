/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { withEmbeddableSubscription } from '../../../../src/plugins/embeddable/public';
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

export function MultiTaskTodoEmbeddableComponentInner(props: Props) {
  const renderTasks = (tasks: MultiTaskTodoOutput['tasks']) =>
    tasks.map(task => (
      <EuiListGroupItem key={task} data-test-subj="multiTaskTodoTask" label={task} />
    ));

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        {props.input.icon ? (
          <EuiIcon type={props.input.icon} size="l" />
        ) : (
          <EuiAvatar name={props.input.title} size="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={1}>
          <EuiFlexItem>
            <EuiText data-test-subj="multiTaskTodoTitle">
              <h3>{props.input.title}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiListGroup bordered={true}>{renderTasks(props.output.tasks)}</EuiListGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const MultiTaskTodoEmbeddableComponent = withEmbeddableSubscription(
  MultiTaskTodoEmbeddableComponentInner
);
