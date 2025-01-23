/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiPortal } from '@elastic/eui';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';

import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '@kbn/controls-plugin/public';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DashboardGrid } from '../grid';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../../dashboard_api/use_dashboard_internal_api';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';

export const DashboardViewport = ({
  dashboardContainerRef,
}: {
  dashboardContainerRef?: React.MutableRefObject<HTMLElement | null>;
}) => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();
  const [hasControls, setHasControls] = useState(false);
  const [
    controlGroupApi,
    dashboardTitle,
    description,
    expandedPanelId,
    panels,
    viewMode,
    useMargins,
    fullScreenMode,
  ] = useBatchedPublishingSubjects(
    dashboardApi.controlGroupApi$,
    dashboardApi.title$,
    dashboardApi.description$,
    dashboardApi.expandedPanelId$,
    dashboardApi.panels$,
    dashboardApi.viewMode$,
    dashboardApi.settings.useMargins$,
    dashboardApi.fullScreenMode$
  );
  const onExit = useCallback(() => {
    dashboardApi.setFullScreenMode(false);
  }, [dashboardApi]);

  const panelCount = useMemo(() => {
    return Object.keys(panels).length;
  }, [panels]);

  const classes = classNames({
    dshDashboardViewport: true,
    'dshDashboardViewport--print': viewMode === 'print',
    'dshDashboardViewport--panelExpanded': Boolean(expandedPanelId),
  });

  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }
    const subscription = controlGroupApi.children$.subscribe((children) => {
      setHasControls(Object.keys(children).length > 0);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

  // Bug in main where panels are loaded before control filters are ready
  // Want to migrate to react embeddable controls with same behavior
  // TODO - do not load panels until control filters are ready
  /*
  const [dashboardInitialized, setDashboardInitialized] = useState(false);
  useEffect(() => {
    let ignore = false;
    dashboard.untilContainerInitialized().then(() => {
      if (!ignore) {
        setDashboardInitialized(true);
      }
    });
    return () => {
      ignore = true;
    };
  }, [dashboard]);
  */

  return (
    <div
      className={classNames('dshDashboardViewportWrapper', {
        'dshDashboardViewportWrapper--defaultBg': !useMargins,
        'dshDashboardViewportWrapper--isFullscreen': fullScreenMode,
      })}
    >
      {viewMode !== 'print' ? (
        <div className={hasControls ? 'dshDashboardViewport-controls' : ''}>
          <ReactEmbeddableRenderer<
            ControlGroupSerializedState,
            ControlGroupRuntimeState,
            ControlGroupApi
          >
            key={dashboardApi.uuid}
            hidePanelChrome={true}
            panelProps={{ hideLoader: true }}
            type={CONTROL_GROUP_TYPE}
            maybeId={'control_group'}
            getParentApi={() => {
              return {
                ...dashboardApi,
                reload$: dashboardInternalApi.controlGroupReload$,
                getSerializedStateForChild: dashboardInternalApi.getSerializedStateForControlGroup,
                getRuntimeStateForChild: dashboardInternalApi.getRuntimeStateForControlGroup,
              };
            }}
            onApiAvailable={(api) => dashboardInternalApi.setControlGroupApi(api)}
          />
        </div>
      ) : null}
      {fullScreenMode && (
        <EuiPortal>
          <ExitFullScreenButton onExit={onExit} toggleChrome={!dashboardApi.isEmbeddedExternally} />
        </EuiPortal>
      )}
      {panelCount === 0 && <DashboardEmptyScreen />}
      <div
        className={classes}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        data-shared-items-count={panelCount}
      >
        <DashboardGrid dashboardContainerRef={dashboardContainerRef} />
      </div>
    </div>
  );
};
