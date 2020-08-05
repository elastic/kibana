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
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPanel,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { TodoInput } from '../../../examples/embeddable_examples/public/todo';
import { TodoEmbeddableFactory } from '../../../examples/embeddable_examples/public';
import { EmbeddableRenderer } from '../../../src/plugins/embeddable/public';

interface Props {
  todoEmbeddableFactory: TodoEmbeddableFactory;
}

interface State {
  task?: string;
  title?: string;
  icon?: string;
  loading: boolean;
  input: TodoInput;
}

export class TodoEmbeddableExample extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      loading: true,
      input: {
        id: '1',
        task: 'Take out the trash',
        icon: 'broom',
        title: 'Trash',
      },
    };
  }

  private onUpdateEmbeddableInput = () => {
    const { task, title, icon, input } = this.state;
    this.setState({ input: { ...input, task: task ?? '', title, icon } });
  };

  public render() {
    return (
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Todo example</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiText>
              This embeddable takes input parameters, task, title and icon. You can update them
              using this form. Input changes will be passed inside `EmbeddableRenderer` as a prop
            </EuiText>
            <EuiFlexGroup>
              <EuiFlexItem grow={true}>
                <EuiFormRow label="Title">
                  <EuiFieldText
                    data-test-subj="titleTodo"
                    onChange={(ev) => this.setState({ title: ev.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiFormRow label="Icon">
                  <EuiFieldText
                    data-test-subj="iconTodo"
                    onChange={(ev) => this.setState({ icon: ev.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label="Task">
                  <EuiTextArea
                    fullWidth
                    resize="horizontal"
                    data-test-subj="taskTodo"
                    onChange={(ev) => this.setState({ task: ev.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiButton
                    data-test-subj="updateTodoButton"
                    onClick={this.onUpdateEmbeddableInput}
                  >
                    Update
                  </EuiButton>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiPanel data-test-subj="todoEmbeddable" paddingSize="none" role="figure">
              <EmbeddableRenderer
                factory={this.props.todoEmbeddableFactory}
                input={this.state.input}
              />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
