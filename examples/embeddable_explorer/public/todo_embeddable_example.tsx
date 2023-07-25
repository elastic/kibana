/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiText,
  EuiTextArea,
  EuiPageTemplate,
  EuiSpacer,
  EuiSelect,
} from '@elastic/eui';
import { TodoEmbeddableFactory } from '@kbn/embeddable-examples-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';

interface Props {
  todoEmbeddableFactory: TodoEmbeddableFactory;
}

interface State {
  task: string;
  title: string;
  icon: string;
}

const ICON_OPTIONS = [
  { value: 'beaker', text: 'beaker' },
  { value: 'bell', text: 'bell' },
  { value: 'bolt', text: 'bolt' },
  { value: 'broom', text: 'broom' },
  { value: 'bug', text: 'bug' },
  { value: 'bullseye', text: 'bullseye' },
];

export class TodoEmbeddableExample extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      icon: 'broom',
      task: 'Take out the trash',
      title: 'Trash',
    };
  }

  public render() {
    return (
      <>
        <EuiPageTemplate.Header pageTitle="Update embeddable state" />
        <EuiPageTemplate.Section grow={false}>
          <>
            <EuiText>
              Use <strong>input</strong> prop to update embeddable state.
            </EuiText>
            <EuiSpacer />
            <EuiForm>
              <EuiFormRow label="Title">
                <EuiFieldText
                  data-test-subj="titleTodo"
                  value={this.state.title}
                  onChange={(ev) => this.setState({ title: ev.target.value })}
                />
              </EuiFormRow>
              <EuiFormRow label="Icon">
                <EuiSelect
                  data-test-subj="iconTodo"
                  value={this.state.icon}
                  options={ICON_OPTIONS}
                  onChange={(ev) => this.setState({ icon: ev.target.value })}
                />
              </EuiFormRow>
              <EuiFormRow label="Task">
                <EuiTextArea
                  fullWidth
                  resize="horizontal"
                  data-test-subj="taskTodo"
                  value={this.state.task}
                  onChange={(ev) => this.setState({ task: ev.target.value })}
                />
              </EuiFormRow>
            </EuiForm>
            <EuiSpacer />
            <EuiPanel data-test-subj="todoEmbeddable" role="figure">
              <EmbeddableRenderer
                factory={this.props.todoEmbeddableFactory}
                input={{
                  id: '1',
                  task: this.state.task,
                  title: this.state.title,
                  icon: this.state.icon,
                }}
              />
            </EuiPanel>
            <EuiSpacer />
            <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
              {`<EmbeddableRenderer
  factory={this.props.todoEmbeddableFactory}
  input={{
    id: '1',
    task: this.state.task,
    title: this.state.title,
    icon: this.state.icon,
  }}
/>`}
            </EuiCodeBlock>
          </>
        </EuiPageTemplate.Section>
      </>
    );
  }
}
