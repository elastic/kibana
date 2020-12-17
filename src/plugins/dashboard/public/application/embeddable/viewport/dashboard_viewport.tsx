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
import { PanelState, ViewMode } from '../../../services/embeddable';
import { DashboardContainer, DashboardReactContextValue } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { context } from '../../../services/kibana_react';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';

export interface DashboardViewportProps {
  switchViewMode?: (newViewMode: ViewMode) => void;
  container: DashboardContainer;
}

interface State {
  isFullScreenMode: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  panels: { [key: string]: PanelState };
  isEmbeddedExternally?: boolean;
}

export class DashboardViewport extends React.Component<DashboardViewportProps, State> {
  static contextType = context;

  public readonly context!: DashboardReactContextValue;
  private subscription?: Subscription;
  private mounted: boolean = false;
  constructor(props: DashboardViewportProps) {
    super(props);
    const {
      isFullScreenMode,
      panels,
      useMargins,
      title,
      isEmbeddedExternally,
    } = this.props.container.getInput();

    this.state = {
      isFullScreenMode,
      panels,
      useMargins,
      title,
      isEmbeddedExternally,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.container.getInput$().subscribe(() => {
      const {
        isFullScreenMode,
        useMargins,
        title,
        description,
        isEmbeddedExternally,
      } = this.props.container.getInput();
      if (this.mounted) {
        this.setState({
          isFullScreenMode,
          description,
          useMargins,
          title,
          isEmbeddedExternally,
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
    const isEditMode = container.getInput().viewMode !== ViewMode.VIEW;
    const {
      isEmbeddedExternally,
      isFullScreenMode,
      panels,
      title,
      description,
      useMargins,
    } = this.state;
    return (
      <React.Fragment>
        <div
          data-shared-items-count={Object.values(panels).length}
          data-shared-items-container
          data-title={title}
          data-description={description}
          className={useMargins ? 'dshDashboardViewport-withMargins' : 'dshDashboardViewport'}
        >
          {isFullScreenMode && (
            <this.context.services.ExitFullScreenButton
              onExitFullScreenMode={this.onExitFullScreenMode}
              toggleChrome={!isEmbeddedExternally}
            />
          )}
          {this.props.container.getPanelCount() === 0 && (
            <div className="dshDashboardEmptyScreen">
              <DashboardEmptyScreen
                isReadonlyMode={
                  this.props.container.getInput().dashboardCapabilities?.hideWriteControls
                }
                onLinkClick={() => this.props.switchViewMode?.(ViewMode.EDIT)}
                isEditMode={isEditMode}
                uiSettings={this.context.services.uiSettings}
                http={this.context.services.http}
              />
            </div>
          )}
          <DashboardGrid container={container} />
        </div>
      </React.Fragment>
    );
  }
}
