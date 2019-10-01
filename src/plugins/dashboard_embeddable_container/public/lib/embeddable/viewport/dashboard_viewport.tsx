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
import { Subscription } from 'rxjs';
import { PanelState } from '../../embeddable_api';
import { DashboardContainer, DashboardReactContextValue } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { context } from '../../../../../kibana_react/public';

export interface DashboardViewportProps {
  container: DashboardContainer;
}

interface State {
  isFullScreenMode: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  panels: { [key: string]: PanelState };
}

export class DashboardViewport extends React.Component<DashboardViewportProps, State> {
  static contextType = context;

  public readonly context!: DashboardReactContextValue;
  private subscription?: Subscription;
  private mounted: boolean = false;
  constructor(props: DashboardViewportProps) {
    super(props);
    const { isFullScreenMode, panels, useMargins, title } = this.props.container.getInput();

    this.state = {
      isFullScreenMode,
      panels,
      useMargins,
      title,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.container.getInput$().subscribe(() => {
      const { isFullScreenMode, useMargins, title, description } = this.props.container.getInput();
      if (this.mounted) {
        this.setState({
          isFullScreenMode,
          description,
          useMargins,
          title,
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
    this.props.container.updateInput({
      isFullScreenMode: false,
    });
  };

  public render() {
    const { container } = this.props;
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
          <this.context.services.ExitFullScreenButton
            onExitFullScreenMode={this.onExitFullScreenMode}
          />
        )}
        <DashboardGrid container={container} />
      </div>
    );
  }
}
