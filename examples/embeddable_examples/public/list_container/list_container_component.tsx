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

import { EuiFlexGroup, EuiSpacer, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import {
  IContainer,
  withEmbeddableSubscription,
  ContainerInput,
  ContainerOutput,
} from '../../../../src/plugins/embeddable/public';
import { EmbeddableListItem } from './embeddable_list_item';

interface Props {
  embeddable: IContainer;
  input: ContainerInput;
  output: ContainerOutput;
}

function renderList(embeddable: IContainer, panels: ContainerInput['panels']) {
  let number = 0;
  const list = Object.values(panels).map(panel => {
    const child = embeddable.getChild(panel.explicitInput.id);
    number++;
    return (
      <EuiPanel key={number.toString()}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3>{number}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EmbeddableListItem embeddable={child} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });
  return list;
}

export function ListContainerComponentInner(props: Props) {
  return (
    <div>
      <h2 data-test-subj="listContainerTitle">{props.embeddable.getTitle()}</h2>
      <EuiSpacer size="l" />
      {renderList(props.embeddable, props.input.panels)}
    </div>
  );
}

// You don't have to use this helper wrapper, but it handles a lot of the React boilerplate for
// embeddables, like setting up the subscriptions to cause the component to refresh whenever
// anything on input or output state changes.  If you don't want that to happen (for example
// if you expect something on input or output state to change frequently that your react
// component does not care about, then you should probably hook this up manually).
export const ListContainerComponent = withEmbeddableSubscription(ListContainerComponentInner);
