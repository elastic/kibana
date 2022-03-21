/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subscription } from 'rxjs';
import { ViewMode } from '../../../services/embeddable';
import { DashboardContainer, DashboardReactContextValue } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { context } from '../../../services/kibana_react';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import {
  CalloutProps,
  ControlGroupContainer,
  LazyControlsCallout,
} from '../../../../../controls/public';
import { withSuspense } from '../../../services/presentation_util';

export interface DashboardViewportProps {
  container: DashboardContainer;
  controlGroup?: ControlGroupContainer;
  controlsEnabled?: boolean;
}

interface State {
  isFullScreenMode: boolean;
  controlGroupReady: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  panelCount: number;
  isEmbeddedExternally?: boolean;
}

const ControlsCallout = withSuspense<CalloutProps>(LazyControlsCallout);

export class DashboardViewport extends React.Component<DashboardViewportProps, State> {
  static contextType = context;
  public declare readonly context: DashboardReactContextValue;

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
      panelCount: Object.values(panels).length,
      useMargins,
      title,
      isEmbeddedExternally,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.container.getInput$().subscribe(() => {
      const { isFullScreenMode, useMargins, title, description, isEmbeddedExternally, panels } =
        this.props.container.getInput();
      if (this.mounted) {
        this.setState({
          panelCount: Object.values(panels).length,
          isEmbeddedExternally,
          isFullScreenMode,
          description,
          useMargins,
          title,
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
    const { container, controlsEnabled, controlGroup } = this.props;
    const isEditMode = container.getInput().viewMode !== ViewMode.VIEW;
    const { isEmbeddedExternally, isFullScreenMode, panelCount, title, description, useMargins } =
      this.state;

    return (
      <>
        {controlsEnabled ? (
          <>
            {isEditMode && panelCount !== 0 && controlGroup?.getPanelCount() === 0 ? (
              <ControlsCallout
                getCreateControlButton={() => {
                  return controlGroup?.getCreateControlButton('callout');
                }}
              />
            ) : null}
            <div className="dshDashboardViewport-controls" ref={this.controlsRoot} />
          </>
        ) : null}
        <div
          data-shared-items-count={panelCount}
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
        <header className="printHeader" />
        <footer className="printFooter">
          <img
            alt="OK"
            src="data:image/png;base64,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
"
          />
        </footer>
      </>
    );
  }
}
