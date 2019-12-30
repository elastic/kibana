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
  EuiFormRow,
  EuiFieldText,
  EuiPanel,
  EuiTextArea,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import {
  TodoEmbeddable,
  TODO_EMBEDDABLE,
  TodoEmbeddableFactory,
} from '../../../examples/embeddable_examples/public/todo';
import { GetEmbeddableFactory, EmbeddableRoot } from '../../../src/plugins/embeddable/public';

interface Props {
  getEmbeddableFactory: GetEmbeddableFactory;
}

interface State {
  task?: string;
  title?: string;
  icon?: string;
  loading: boolean;
}

export class TodoEmbeddableExample extends React.Component<Props, State> {
  private embeddable?: TodoEmbeddable;

  constructor(props: Props) {
    super(props);

    this.state = { loading: true };
  }

  public componentDidMount() {
    const factory = this.props.getEmbeddableFactory(TODO_EMBEDDABLE) as TodoEmbeddableFactory;

    if (factory === undefined) {
      throw new Error('Embeddable factory is undefined!');
    }

    factory
      .create({
        id: '1',
        task: 'Take out the trash',
        icon: 'broom',
        title: 'Trash',
      })
      .then(embeddable => {
        this.embeddable = embeddable;
        this.setState({ loading: false });
      });
  }

  public componentWillUnmount() {
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  private onUpdateEmbeddableInput = () => {
    if (this.embeddable) {
      const { task, title, icon } = this.state;
      this.embeddable.updateInput({ task, title, icon });
    }
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
              using this form. In the code, pressing update will call
              <pre>
                <code>
                  const &#123; task, title, icon &#125; = this.state;
                  <br />
                  this.embeddable.updateInput(&#123; task, title, icon &#125;);
                </code>
              </pre>
              <p>
                You may also notice this example uses `EmbeddableRoot` instead of the
                `EmbeddableFactoryRenderer` helper component. This is because it needs a reference
                to the embeddable to update it, and `EmbeddableFactoryRenderer` creates and holds
                the embeddable instance internally.
              </p>
            </EuiText>
            <EuiFlexGroup>
              <EuiFlexItem grow={true}>
                <EuiFormRow label="Title">
                  <EuiFieldText
                    data-test-subj="titleTodo"
                    onChange={ev => this.setState({ title: ev.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiFormRow label="Icon">
                  <EuiFieldText
                    data-test-subj="iconTodo"
                    onChange={ev => this.setState({ icon: ev.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label="Task">
                  <EuiTextArea
                    fullWidth
                    resize="horizontal"
                    data-test-subj="taskTodo"
                    onChange={ev => this.setState({ task: ev.target.value })}
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
              <EmbeddableRoot embeddable={this.embeddable} loading={this.state.loading} />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
