/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subscription } from 'rxjs';
import { PanelState, ViewMode } from '../../../services/embeddable';
import { DashboardContainer, DashboardReactContextValue } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { context } from '../../../services/kibana_react';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { ControlGroupContainer } from '../../../../../presentation_util/public';

export interface DashboardViewportProps {
  container: DashboardContainer;
  controlGroup?: ControlGroupContainer;
}

interface State {
  isFullScreenMode: boolean;
  controlGroupReady: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  panels: { [key: string]: PanelState };
  isEmbeddedExternally?: boolean;
}

export class DashboardViewport extends React.Component<DashboardViewportProps, State> {
  static contextType = context;
  public readonly context!: DashboardReactContextValue;

  private controlsRoot: React.RefObject<HTMLDivElement>;

  private subscription?: Subscription;
  private mounted: boolean = false;
  constructor(props: DashboardViewportProps) {
    super(props);
    const { isFullScreenMode, panels, useMargins, title, isEmbeddedExternally } =
      this.props.container.getInput();

    this.controlsRoot = React.createRef();

    this.state = {
      controlGroupReady: !this.props.controlGroup,
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
      const { isFullScreenMode, useMargins, title, description, isEmbeddedExternally } =
        this.props.container.getInput();
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
    if (this.props.controlGroup && this.controlsRoot.current) {
      this.props.controlGroup.render(this.controlsRoot.current);
    }
    if (this.props.controlGroup) {
      this.props.controlGroup?.untilReady().then(() => this.setState({ controlGroupReady: true }));
    }
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
    const viewMode = container.getInput().viewMode;
    const isEditMode = viewMode !== ViewMode.VIEW && viewMode !== ViewMode.PRINT;
    const { isEmbeddedExternally, isFullScreenMode, panels, title, description, useMargins } =
      this.state;
    return (
      <>
        <div className="dshDashboardViewport-controlGroup" ref={this.controlsRoot} />
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
                  !this.props.container.getInput().dashboardCapabilities?.showWriteControls
                }
                isEditMode={isEditMode}
                uiSettings={this.context.services.uiSettings}
                http={this.context.services.http}
              />
            </div>
          )}
          {this.state.controlGroupReady && <DashboardGrid container={container} />}
        </div>
      </>
    );
  }
}
