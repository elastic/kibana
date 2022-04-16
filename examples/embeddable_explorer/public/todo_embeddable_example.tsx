/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { TodoInput } from '@kbn/embeddable-examples-plugin/public/todo';
import { TodoEmbeddableFactory } from '@kbn/embeddable-examples-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';

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
