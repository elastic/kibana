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
import { CoreStart } from 'src/core/public';
import { TGetActionsCompatibleWithTrigger } from 'src/plugins/ui_actions/public';

import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { ErrorEmbeddable, IEmbeddable } from '../embeddables';
import { EmbeddablePanel } from '../panel';
import { IContainer } from './i_container';
import { GetEmbeddableFactory, GetEmbeddableFactories } from '../types';

export interface EmbeddableChildPanelProps {
  embeddableId: string;
  className?: string;
  container: IContainer;
  getActions: TGetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
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
    const classes = classNames('embPanel', {
      'embPanel-isLoading': this.state.loading,
    });

    return (
      <div className={classes}>
        {this.state.loading || !this.embeddable ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <EmbeddablePanel
            embeddable={this.embeddable}
            getActions={this.props.getActions}
            getEmbeddableFactory={this.props.getEmbeddableFactory}
            getAllEmbeddableFactories={this.props.getAllEmbeddableFactories}
            overlays={this.props.overlays}
            notifications={this.props.notifications}
            inspector={this.props.inspector}
            SavedObjectFinder={this.props.SavedObjectFinder}
          />
        )}
      </div>
    );
  }
}
