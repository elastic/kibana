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

import classNames from 'classnames';
import React from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { Subscription } from 'rxjs';
import { ErrorEmbeddable, IEmbeddable } from '../embeddables';
import { IContainer } from './i_container';
import { EmbeddableStart } from '../../plugin';

export interface EmbeddableChildPanelProps {
  embeddableId: string;
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
    const { PanelComponent } = this.props;
    const classes = classNames('embPanel', {
      'embPanel-isLoading': this.state.loading,
    });

    return (
      <div className={classes}>
        {this.state.loading || !this.embeddable ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <PanelComponent embeddable={this.embeddable} />
        )}
      </div>
    );
  }
}
