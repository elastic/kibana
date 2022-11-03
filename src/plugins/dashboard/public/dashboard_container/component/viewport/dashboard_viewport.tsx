/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';

import { CoreStart } from '@kbn/core/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/kibana-react-plugin/public';
import { CalloutProps, LazyControlsCallout } from '@kbn/controls-plugin/public';

import { DashboardGrid } from '../grid';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { useDashboardContainerContext } from '../../dashboard_container_renderer';
import { DashboardContainer, DashboardLoadedInfo } from '../../embeddable/dashboard_container';

const ControlsCallout = withSuspense<CalloutProps>(LazyControlsCallout);

export interface DashboardViewportProps {
  container: DashboardContainer;
  onDataLoaded?: (data: DashboardLoadedInfo) => void;
}

export const DashboardViewport = ({ onDataLoaded }: DashboardViewportProps) => {
  const {
    chrome,
    settings: { isProjectEnabledInLabs, uiSettings },
  } = pluginServices.getServices();
  const controlsRoot = useRef(null);

  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setFullScreenMode },
    embeddableInstance: dashboardContainer,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  /**
   * Render Control group
   */
  const controlGroup = dashboardContainer.controlGroup;
  useEffect(() => {
    if (controlGroup && controlsRoot.current) controlGroup.render(controlsRoot.current);
  }, [controlGroup]);

  const panelCount = Object.keys(select((state) => state.explicitInput.panels)).length;
  const controlCount = Object.keys(
    select((state) => state.explicitInput.controlGroupInput?.panels) ?? {}
  ).length;

  const viewMode = select((state) => state.explicitInput.viewMode);
  const dashboardTitle = select((state) => state.explicitInput.title);
  const description = select((state) => state.explicitInput.description);
  const useMargins = select((state) => state.explicitInput.options.useMargins);
  const isFullScreenMode = select((state) => state.componentState.fullScreenMode);

  const controlsEnabled = isProjectEnabledInLabs('labs:dashboard:dashboardControls');
  const hideAnnouncements = Boolean(uiSettings.get('hideAnnouncements'));

  // TODO is embedded externally
  return (
    <>
      {controlsEnabled && controlGroup ? (
        <>
          {!hideAnnouncements &&
          viewMode === ViewMode.EDIT &&
          panelCount !== 0 &&
          controlCount === 0 ? (
            <ControlsCallout
              getCreateControlButton={() => {
                return controlGroup && controlGroup.getCreateControlButton('callout');
              }}
            />
          ) : null}

          {viewMode !== ViewMode.PRINT && (
            <div
              className={controlCount > 0 ? 'dshDashboardViewport-controls' : ''}
              ref={controlsRoot}
            />
          )}
        </>
      ) : null}
      <div
        data-shared-items-count={panelCount}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        className={useMargins ? 'dshDashboardViewport-withMargins' : 'dshDashboardViewport'}
      >
        {isFullScreenMode && (
          // TODO: Replace with Shared UX ExitFullScreenButton once https://github.com/elastic/kibana/issues/140311 is resolved
          <ExitFullScreenButton
            chrome={chrome as CoreStart['chrome']}
            onExitFullScreenMode={() => dispatch(setFullScreenMode(false))}
            toggleChrome={true}
          />
        )}
        {panelCount === 0 && (
          <div className="dshDashboardEmptyScreen">
            <DashboardEmptyScreen isEditMode={viewMode === ViewMode.EDIT} />
          </div>
        )}
        <DashboardGrid onDataLoaded={onDataLoaded} />
      </div>
    </>
  );
};
