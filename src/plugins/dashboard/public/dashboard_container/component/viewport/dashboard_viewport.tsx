/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';

import { css } from '@emotion/react';
import { EuiPortal } from '@elastic/eui';
import { DashboardGrid } from '../grid';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { useDashboardContainerContext } from '../../dashboard_container_context';

export const DashboardViewportComponent = () => {
  const {
    settings: { isProjectEnabledInLabs },
  } = pluginServices.getServices();
  const controlsRoot = useRef(null);

  const { useEmbeddableSelector: select, embeddableInstance: dashboardContainer } =
    useDashboardContainerContext();

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
  const useMargins = select((state) => state.explicitInput.useMargins);
  const description = select((state) => state.explicitInput.description);
  const expandedPanelId = select((state) => state.componentState.expandedPanelId);
  const expandedPanelStyles = css`
    flex: 1;
  `;
  const controlsEnabled = isProjectEnabledInLabs('labs:dashboard:dashboardControls');

  return (
    <div
      css={
        viewMode === ViewMode.EDIT
          ? css`
              padding-top: 105px; // THIS SHOULDN'T BE STATIC - NEED TO KNOW THE HEIGHT OF THE HEADER
            `
          : css`
              padding-top: 55px;
            `
      }
    >
      {controlsEnabled && controlGroup && viewMode !== ViewMode.PRINT ? (
        <div
          className={controlCount > 0 ? 'dshDashboardViewport-controls' : ''}
          ref={controlsRoot}
        />
      ) : null}
      <div
        data-shared-items-count={panelCount}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        className={useMargins ? 'dshDashboardViewport-withMargins' : 'dshDashboardViewport'}
        css={expandedPanelId ? expandedPanelStyles : undefined}
      >
        {panelCount === 0 && (
          <div className="dshDashboardEmptyScreen">
            <DashboardEmptyScreen isEditMode={viewMode === ViewMode.EDIT} />
          </div>
        )}
        <DashboardGrid />
      </div>
    </div>
  );
};

// This fullscreen button HOC separates fullscreen button and dashboard content to reduce rerenders
// because ExitFullScreenButton sets isFullscreenMode to false on unmount while rerendering.
// This specifically fixed maximizing/minimizing panels without exiting fullscreen mode.
const WithFullScreenButton = ({ children }: { children: JSX.Element }) => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setFullScreenMode },
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const isFullScreenMode = select((state) => state.componentState.fullScreenMode);
  const isEmbeddedExternally = select((state) => state.componentState.isEmbeddedExternally);

  return (
    <>
      {children}
      {isFullScreenMode && (
        <EuiPortal>
          <ExitFullScreenButton
            onExit={() => dispatch(setFullScreenMode(false))}
            toggleChrome={!isEmbeddedExternally}
          />
        </EuiPortal>
      )}
    </>
  );
};

export const DashboardViewport = () => (
  <WithFullScreenButton>
    <DashboardViewportComponent />
  </WithFullScreenButton>
);
