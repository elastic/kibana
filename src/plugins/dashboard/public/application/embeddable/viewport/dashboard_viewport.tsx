/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subscription } from 'rxjs';

import {
  CalloutProps,
  ControlGroupContainer,
  LazyControlsCallout,
} from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { context } from '@kbn/kibana-react-plugin/public';
import { ExitFullScreenButton as ExitFullScreenButtonUi } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';

import { DashboardContainer, DashboardLoadedInfo } from '../dashboard_container';
import { DashboardGrid } from '../grid';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { pluginServices } from '../../../services/plugin_services';

export interface DashboardViewportProps {
  container: DashboardContainer;
  controlGroup?: ControlGroupContainer;
  onDataLoaded?: (data: DashboardLoadedInfo) => void;
}

interface State {
  isFullScreenMode: boolean;
  useMargins: boolean;
  title: string;
  description?: string;
  panelCount: number;
  isEmbeddedExternally?: boolean;
}

const ControlsCallout = withSuspense<CalloutProps>(LazyControlsCallout);

export class DashboardViewport extends React.Component<DashboardViewportProps, State> {
  static contextType = context;
  private controlsRoot: React.RefObject<HTMLDivElement>;

  private subscription?: Subscription;
  private mounted: boolean = false;
  constructor(props: DashboardViewportProps) {
    super(props);
    const { isFullScreenMode, panels, useMargins, title, isEmbeddedExternally } =
      this.props.container.getInput();

    this.controlsRoot = React.createRef();

    this.state = {
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
    const { container, controlGroup } = this.props;
    const isEditMode = container.getInput().viewMode !== ViewMode.VIEW;
    const { isEmbeddedExternally, isFullScreenMode, panelCount, title, description, useMargins } =
      this.state;

    const {
      settings: { isProjectEnabledInLabs, uiSettings },
      chrome,
    } = pluginServices.getServices();
    const controlsEnabled = isProjectEnabledInLabs('labs:dashboard:dashboardControls');

    const hideAnnouncements = Boolean(uiSettings.get('hideAnnouncements'));

    return (
      <>
        {controlsEnabled ? (
          <>
            {!hideAnnouncements &&
            isEditMode &&
            panelCount !== 0 &&
            controlGroup?.getPanelCount() === 0 ? (
              <ControlsCallout
                getCreateControlButton={() => {
                  return controlGroup?.getCreateControlButton('callout');
                }}
              />
            ) : null}

            {container.getInput().viewMode !== ViewMode.PRINT && (
              <div
                className={
                  controlGroup && controlGroup.getPanelCount() > 0
                    ? 'dshDashboardViewport-controls'
                    : ''
                }
                ref={this.controlsRoot}
              />
            )}
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
            // TODO: Replace with Shared UX ExitFullScreenButton once https://github.com/elastic/kibana/issues/140311 is resolved
            <ExitFullScreenButtonUi
              chrome={chrome as CoreStart['chrome']}
              onExitFullScreenMode={this.onExitFullScreenMode}
              toggleChrome={!isEmbeddedExternally}
            />
          )}
          {this.props.container.getPanelCount() === 0 && (
            <div className="dshDashboardEmptyScreen">
              <DashboardEmptyScreen isEditMode={isEditMode} />
            </div>
          )}
          <DashboardGrid container={container} onDataLoaded={this.props.onDataLoaded} />
        </div>
      </>
    );
  }
}
