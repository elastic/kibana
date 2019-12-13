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
import ReactDOM from 'react-dom';
import { EuiPageBody } from '@elastic/eui';
import {
  IEmbeddableStart,
  GetEmbeddableFactory,
  ViewMode,
  ErrorEmbeddable,
} from 'src/plugins/embeddable/public';
import {
  DashboardContainer,
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerFactory,
  DashboardContainerInput,
} from 'src/plugins/dashboard_embeddable_container/public';
import { SearchCollectorFactory } from 'src/plugins/data/public';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { HELLO_WORLD_EMBEDDABLE } from '../../embeddable_examples/public';

interface Props {
  createSearchCollector: SearchCollectorFactory;
  getEmbeddableFactory: GetEmbeddableFactory;
}

interface State {}

export class MakeItSlowExplorerApp extends React.Component<Props, State> {
  private embeddable?: DashboardContainer | ErrorEmbeddable;

  constructor(props: Props) {
    super(props);

    this.state = { loading: true };
  }

  public componentDidMount() {
    const factory = this.props.getEmbeddableFactory(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;

    if (factory === undefined) {
      throw new Error('Embeddable factory is undefined!');
    }

    const input: DashboardContainerInput = {
      id: 'hello',
      title: 'My todo list',
      viewMode: ViewMode.EDIT,
      timeRange: {
        to: 'now',
        from: 'now-15d',
      },
      useMargins: false,
      isFullScreenMode: false,
      filters: [],
      query: { language: 'kql', query: '' },
      panels: {
        '1': {
          gridData: {
            w: 24,
            h: 15,
            x: 0,
            y: 15,
            i: '1',
          },
          type: HELLO_WORLD_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
    };

    factory
      .create(input, { createSearchCollector: this.props.createSearchCollector })
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

export const renderApp = (
  core: CoreStart,
  embeddableApi: IEmbeddableStart,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<MakeItSlowExplorerApp embeddableApi={embeddableApi} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
