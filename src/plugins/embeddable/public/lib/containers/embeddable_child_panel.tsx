/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { Subscription } from 'rxjs';
import { ErrorEmbeddable, IEmbeddable } from '../embeddables';
import { IContainer } from './i_container';
import { EmbeddableStart } from '../../plugin';

export interface EmbeddableChildPanelProps {
  embeddableId: string;
  index?: number;
  className?: string;
  container: IContainer;
  PanelComponent: EmbeddableStart['EmbeddablePanel'];
}

interface State {
  loading: boolean;
}

/**
 * This component can be used by embeddable containers using react to easily render children. It waits
 * for the child to be initialized, showing a loading indicator until that is complete.
 */

export class EmbeddableChildPanel extends React.Component<EmbeddableChildPanelProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: IEmbeddable | ErrorEmbeddable;
  private subscription?: Subscription;

  constructor(props: EmbeddableChildPanelProps) {
    super(props);
    this.state = {
      loading: true,
    };

    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    const { container } = this.props;

    this.embeddable = await container.untilEmbeddableLoaded(this.props.embeddableId);
    if (this.mounted) {
      this.setState({ loading: false });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public render() {
    const { PanelComponent, index } = this.props;
    const classes = classNames('embPanel', {
      'embPanel-isLoading': this.state.loading,
    });

    return (
      <div className={classes}>
        {this.state.loading || !this.embeddable ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <PanelComponent embeddable={this.embeddable} index={index} />
        )}
      </div>
    );
  }
}
