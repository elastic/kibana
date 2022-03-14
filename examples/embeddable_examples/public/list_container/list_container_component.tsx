/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiSpacer, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import {
  IContainer,
  withEmbeddableSubscription,
  ContainerInput,
  ContainerOutput,
  EmbeddableStart,
  EmbeddableChildPanel,
} from '../../../../src/plugins/embeddable/public';

interface Props {
  embeddable: IContainer;
  input: ContainerInput;
  output: ContainerOutput;
  embeddableServices: EmbeddableStart;
}

function renderList(
  embeddable: IContainer,
  panels: ContainerInput['panels'],
  embeddableServices: EmbeddableStart
) {
  let number = 0;
  const list = Object.values(panels).map((panel) => {
    number++;
    return (
      <EuiPanel key={number.toString()}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3>{number}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EmbeddableChildPanel
              PanelComponent={embeddableServices.EmbeddablePanel}
              embeddableId={panel.explicitInput.id}
              container={embeddable}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });
  return list;
}

export function ListContainerComponentInner({ embeddable, input, embeddableServices }: Props) {
  return (
    <div>
      <h2 data-test-subj="listContainerTitle">{embeddable.getTitle()}</h2>
      <EuiSpacer size="l" />
      {renderList(embeddable, input.panels, embeddableServices)}
    </div>
  );
}

// You don't have to use this helper wrapper, but it handles a lot of the React boilerplate for
// embeddables, like setting up the subscriptions to cause the component to refresh whenever
// anything on input or output state changes.  If you don't want that to happen (for example
// if you expect something on input or output state to change frequently that your react
// component does not care about, then you should probably hook this up manually).
export const ListContainerComponent = withEmbeddableSubscription<
  ContainerInput,
  ContainerOutput,
  IContainer,
  { embeddableServices: EmbeddableStart }
>(ListContainerComponentInner);
