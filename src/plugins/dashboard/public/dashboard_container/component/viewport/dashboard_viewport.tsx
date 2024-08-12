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
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';

import { DashboardGrid } from '../grid';
import { DashboardContainer, useDashboardContainer } from '../../embeddable/dashboard_container';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { ControlGroupApi, ControlGroupRuntimeState, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { getReferencesForControls } from '../../../../common/dashboard_container/persistable_state/dashboard_container_references';

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

function getInitialHasControls(dashboard: DashboardContainer) {
  if (!dashboard.controlGroupInput) {
    return false;
  }

  try {
    const panels = JSON.parse(dashboard.controlGroupInput.panelsJSON);
    return Object.keys(panels).length > 0;
  } catch(error) {
    // ignore parse error, ReactEmbeddableRenderer will surface parse error to user
    return false;
  }
}

export const DashboardViewportComponent = () => {
  const controlsRoot = useRef(null);

  const dashboard = useDashboardContainer();

  const panelCount = Object.keys(dashboard.select((state) => state.explicitInput.panels)).length;
  const [hasControls, setHasControls] = useState(getInitialHasControls(dashboard));
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const dashboardTitle = dashboard.select((state) => state.explicitInput.title);
  const useMargins = dashboard.select((state) => state.explicitInput.useMargins);
  const description = dashboard.select((state) => state.explicitInput.description);
  const focusedPanelId = dashboard.select((state) => state.componentState.focusedPanelId);
  const expandedPanelId = dashboard.select((state) => state.componentState.expandedPanelId);

  const { ref: resizeRef, width: viewportWidth } = useDebouncedWidthObserver(!!focusedPanelId);

  const classes = classNames({
    dshDashboardViewport: true,
    'dshDashboardViewport--panelExpanded': Boolean(expandedPanelId),
  });

  useEffect(() => {
    const controlGroupApi = dashboard.controlGroupApi$.value;
    if (!controlGroupApi) {
      return;
    }
    const subscription = controlGroupApi.children$.subscribe((children) => {
      setHasControls(Object.keys(children).length > 0);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [dashboard.controlGroupApi$]);

  return (
    <div
      className={classNames('dshDashboardViewportWrapper', {
        'dshDashboardViewportWrapper--defaultBg': !useMargins,
      })}
    >
      {viewMode !== ViewMode.PRINT ? (
        <div
          className={hasControls ? 'dshDashboardViewport-controls' : ''}
          ref={controlsRoot}
        >
          <ReactEmbeddableRenderer<ControlGroupSerializedState, ControlGroupRuntimeState, ControlGroupApi>
            hidePanelChrome={true}
            type={CONTROL_GROUP_TYPE}
            maybeId={'control_group'}
            getParentApi={() => {
              return {
                ...dashboard,
                getSerializedStateForChild: () => {
                  return {
                    rawState: dashboard.controlGroupInput
                      ? dashboard.controlGroupInput as ControlGroupSerializedState
                      : {
                        controlStyle: 'oneLine',
                        chainingSystem: 'HIERARCHICAL',
                        showApplySelections: false,
                        panelsJSON: JSON.stringify({}),
                        ignoreParentSettingsJSON:
                          '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
                      },
                    references: getReferencesForControls(dashboard.savedObjectReferences)
                  };
                },
              };
            }}
            onApiAvailable={(api) => dashboard.setControlGroupApi(api)}
          />
        </div>
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
