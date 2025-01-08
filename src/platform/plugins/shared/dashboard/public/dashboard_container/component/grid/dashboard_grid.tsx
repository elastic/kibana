/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DashboardPanelState } from '../../../../common';
import { arePanelLayoutsEqual } from '../../../dashboard_api/are_panel_layouts_equal';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from '../../../dashboard_constants';
import { DashboardGridItem } from './dashboard_grid_item';

export const DashboardGrid = () => {
  const dashboardApi = useDashboardApi();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});

  const [expandedPanelId, panels, useMargins, viewMode, controlGroupApi] =
    useBatchedPublishingSubjects(
      dashboardApi.expandedPanelId,
      dashboardApi.panels$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode,
      dashboardApi.controlGroupApi$
    );

  const currentLayout: GridLayoutData = useMemo(() => {
    const singleRow: GridLayoutData[number] = {
      title: 'First row',
      isCollapsed: false,
      panels: {},
    };

    Object.keys(panels).forEach((panelId) => {
      const gridData = panels[panelId].gridData;
      singleRow.panels[panelId] = {
        id: panelId,
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
      };
    });

    return [singleRow];
  }, [panels]);

  const appFixedViewport = useAppFixedViewport();

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== ViewMode.EDIT) return;

      const currentPanels = dashboardApi.panels$.getValue();
      const updatedPanels: { [key: string]: DashboardPanelState } = Object.values(
        newLayout[0].panels
      ).reduce((updatedPanelsAcc, panelLayout) => {
        updatedPanelsAcc[panelLayout.id] = {
          ...currentPanels[panelLayout.id],
          gridData: {
            i: panelLayout.id,
            y: panelLayout.row,
            x: panelLayout.column,
            w: panelLayout.width,
            h: panelLayout.height,
          },
        };
        return updatedPanelsAcc;
      }, {} as { [key: string]: DashboardPanelState });
      if (!arePanelLayoutsEqual(currentPanels, updatedPanels)) {
        dashboardApi.setPanels(updatedPanels);
      }
    },
    [dashboardApi, viewMode]
  );

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === 'view',
    'dshLayout--editing': viewMode !== 'view',
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  const renderPanelContents = useCallback(
    (id: string, setDragHandles?: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = dashboardApi.panels$.getValue();
      if (!currentPanels[id]) return;

      if (!panelRefs.current[id]) {
        panelRefs.current[id] = React.createRef();
      }

      const type = currentPanels[id].type;
      return (
        <DashboardGridItem
          ref={panelRefs.current[id]}
          data-grid={currentPanels[id].gridData}
          key={id}
          id={id}
          type={type}
          setDragHandles={setDragHandles}
          appFixedViewport={appFixedViewport}
        />
      );
    },
    [appFixedViewport, dashboardApi]
  );

  const gridSettings = useMemo(() => {
    return {
      gutterSize: useMargins ? DASHBOARD_MARGIN_SIZE : 0,
      rowHeight: DASHBOARD_GRID_HEIGHT,
      columnCount: DASHBOARD_GRID_COLUMN_COUNT,
    };
  }, [useMargins]);

  const [controlGroupReady, setControlGroupReady] = useState<boolean>(false);
  useEffect(() => {
    // used to wait for the "true height" when the dashboard is loading with an expanded panel VIA the url
    let mounted = true;
    controlGroupApi?.untilInitialized().then(() => {
      if (!mounted) return;
      setControlGroupReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [controlGroupApi]);

  const memoizedgridLayout = useMemo(() => {
    // TODO - test to see if this memo makes a difference
    return (
      <GridLayout
        layout={currentLayout}
        gridSettings={gridSettings}
        renderPanelContents={renderPanelContents}
        onLayoutChange={onLayoutChange}
        expandedPanelId={expandedPanelId}
        accessMode={viewMode === 'view' ? 'VIEW' : 'EDIT'}
      />
    );
  }, [currentLayout, gridSettings, renderPanelContents, onLayoutChange, expandedPanelId, viewMode]);

  // // in print mode, dashboard layout is not controlled by React Grid Layout
  // if (viewMode === ViewMode.PRINT) {
  //   return <>{panelComponents}</>;
  // }

  return (
    <div className={classes}>
      {!expandedPanelId || controlGroupReady ? memoizedgridLayout : <></>}
    </div>
  );
};
