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

import { EmbeddableFactoryRegistry, ViewMode, PanelState } from 'plugins/embeddable_api/index';
import React from 'react';
// @ts-ignore
import { ExitFullScreenButton } from 'ui/exit_full_screen';
import { DashboardContainer } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { DashboardPanelState } from '../types';

interface Props {
  container: DashboardContainer;
  embeddableFactories: EmbeddableFactoryRegistry;
}

interface State {
  isFullScreenMode: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  expandedPanelId?: string;
  panels: { [key: string]: PanelState };
}

export class DashboardViewport extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;
  constructor(props: Props) {
    super(props);
    const {
      isFullScreenMode,
      panels,
      useMargins,
      expandedPanelId,
      title,
    } = this.props.container.getInput();

    this.state = {
      isFullScreenMode,
      panels,
      useMargins,
      expandedPanelId,
      title,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.container.getInput$().subscribe(() => {
      const {
        isFullScreenMode,
        useMargins,
        expandedPanelId,
        title,
        description,
        panels,
      } = this.props.container.getInput();
      if (this.mounted) {
        this.setState({
          expandedPanelId,
          useMargins,
          isFullScreenMode,
          description,
          title,
          panels,
        });
      }
    });
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public onExitFullScreenMode = () => {
    this.props.container.onExitFullScreenMode();
  };

  public render() {
    const { embeddableFactories, container } = this.props;
    return (
      <div
        data-shared-items-count={Object.values(this.state.panels).length}
        data-shared-items-container
        data-title={this.state.title}
        data-description={this.state.description}
        className={
          this.state.useMargins ? 'dshDashboardViewport-withMargins' : 'dshDashboardViewport'
        }
      >
        {this.state.isFullScreenMode && (
          <ExitFullScreenButton onExitFullScreenMode={this.onExitFullScreenMode} />
        )}
        <DashboardGrid
          embeddableFactories={embeddableFactories}
          maximizedPanelId={this.state.expandedPanelId}
          panels={this.state.panels}
          onPanelsUpdated={this.onPanelsUpdated}
          useMargins={this.state.useMargins}
          container={container}
        />
      </div>
    );
  }
}
