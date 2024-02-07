/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import classNames from 'classnames';
import useResizeObserver from 'use-resize-observer/polyfilled';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { EuiPortal } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';

import { DashboardGrid } from '../grid';
import { useDashboardContainer } from '../../embeddable/dashboard_container';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';

export const useDebouncedWidthObserver = (skipDebounce = false, wait = 100) => {
  const [width, setWidth] = useState<number>(0);
  const onWidthChange = useMemo(() => debounce(setWidth, wait), [wait]);
  const { ref } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      if (dimensions.width) {
        if (width === 0 || skipDebounce) setWidth(dimensions.width);
        if (dimensions.width !== width) onWidthChange(dimensions.width);
      }
    },
  });
  return { ref, width };
};

export const DashboardViewportComponent = () => {
  const controlsRoot = useRef(null);

  const dashboard = useDashboardContainer();

  /**
   * Render Control group
   */
  const controlGroup = dashboard.controlGroup;
  useEffect(() => {
    if (controlGroup && controlsRoot.current) controlGroup.render(controlsRoot.current);
  }, [controlGroup]);

  const panelCount = Object.keys(dashboard.select((state) => state.explicitInput.panels)).length;
  const controlCount = Object.keys(
    controlGroup?.select((state) => state.explicitInput.panels) ?? {}
  ).length;

  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const dashboardTitle = dashboard.select((state) => state.explicitInput.title);
  const description = dashboard.select((state) => state.explicitInput.description);
  const focusedPanelId = dashboard.select((state) => state.componentState.focusedPanelId);
  const expandedPanelId = dashboard.select((state) => state.componentState.expandedPanelId);

  const { ref: resizeRef, width: viewportWidth } = useDebouncedWidthObserver(!!focusedPanelId);

  const classes = classNames({
    dshDashboardViewport: true,
    'dshDashboardViewport--panelExpanded': Boolean(expandedPanelId),
  });

  return (
    <div className={'dshDashboardViewportWrapper'}>
      {controlGroup && viewMode !== ViewMode.PRINT ? (
        <div
          className={controlCount > 0 ? 'dshDashboardViewport-controls' : ''}
          ref={controlsRoot}
        />
      ) : null}
      {panelCount === 0 && <DashboardEmptyScreen />}
      <div
        ref={resizeRef}
        className={classes}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        data-shared-items-count={panelCount}
      >
        {/* Wait for `viewportWidth` to actually be set before rendering the dashboard grid - 
            otherwise, there is a race condition where the panels can end up being squashed */}
        {viewportWidth !== 0 && <DashboardGrid viewportWidth={viewportWidth} />}
      </div>
    </div>
  );
};

// This fullscreen button HOC separates fullscreen button and dashboard content to reduce rerenders
// because ExitFullScreenButton sets isFullscreenMode to false on unmount while rerendering.
// This specifically fixed maximizing/minimizing panels without exiting fullscreen mode.
const WithFullScreenButton = ({ children }: { children: JSX.Element }) => {
  const dashboard = useDashboardContainer();

  const isFullScreenMode = dashboard.select((state) => state.componentState.fullScreenMode);
  const isEmbeddedExternally = dashboard.select(
    (state) => state.componentState.isEmbeddedExternally
  );

  return (
    <>
      {children}
      {isFullScreenMode && (
        <EuiPortal>
          <ExitFullScreenButton
            onExit={() => dashboard.dispatch.setFullScreenMode(false)}
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
