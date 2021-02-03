/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component, RefObject } from 'react';
import { Subscription } from 'rxjs';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { IContainer, PanelState, EmbeddableChildPanel } from '../..';
import { EmbeddableStart } from '../../../plugin';

interface Props {
  container: IContainer;
  panelComponent: EmbeddableStart['EmbeddablePanel'];
}

interface State {
  panels: { [key: string]: PanelState };
  loaded: { [key: string]: boolean };
}

export class HelloWorldContainerComponent extends Component<Props, State> {
  private roots: { [key: string]: RefObject<HTMLDivElement> } = {};
  private mounted: boolean = false;
  private inputSubscription?: Subscription;
  private outputSubscription?: Subscription;

  constructor(props: Props) {
    super(props);

    Object.values(this.props.container.getInput().panels).forEach((panelState) => {
      this.roots[panelState.explicitInput.id] = React.createRef();
    });

    this.state = {
      loaded: this.props.container.getOutput().embeddableLoaded,
      panels: this.props.container.getInput().panels,
    };
  }

  public async componentDidMount() {
    this.mounted = true;

    this.inputSubscription = this.props.container.getInput$().subscribe(() => {
      if (this.mounted) {
        this.setState({ panels: this.props.container.getInput().panels });
      }
    });

    this.outputSubscription = this.props.container.getOutput$().subscribe(() => {
      if (this.mounted) {
        this.setState({ loaded: this.props.container.getOutput().embeddableLoaded });
      }
    });
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.props.container.destroy();

    if (this.inputSubscription) {
      this.inputSubscription.unsubscribe();
    }

    if (this.outputSubscription) {
      this.outputSubscription.unsubscribe();
    }
  }

  public render() {
    return (
      <div>
        <h2>HELLO WORLD! These are my precious embeddable children:</h2>
        <EuiSpacer size="l" />
        <EuiFlexGroup>{this.renderList()}</EuiFlexGroup>
      </div>
    );
  }

  private renderList() {
    const list = Object.values(this.state.panels).map((panelState) => {
      const item = (
        <EuiFlexItem key={panelState.explicitInput.id}>
          <EmbeddableChildPanel
            container={this.props.container}
            embeddableId={panelState.explicitInput.id}
            PanelComponent={this.props.panelComponent}
          />
        </EuiFlexItem>
      );
      return item;
    });
    return list;
  }
}
