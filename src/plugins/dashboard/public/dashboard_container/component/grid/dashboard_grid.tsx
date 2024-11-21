/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/styles.css';

import { pick } from 'lodash';
import classNames from 'classnames';
import React, { useState, useMemo, useCallback, useEffect, Profiler } from 'react';
import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { useDashboardGridSettings } from './use_dashboard_grid_settings';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { arePanelLayoutsEqual } from '../../../dashboard_api/are_panel_layouts_equal';
import { useDashboardInternalApi } from '../../../dashboard_api/use_dashboard_internal_api';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from '../../../dashboard_constants';

export const DashboardGrid = ({
  dashboardContainer,
  viewportWidth,
}: {
  dashboardContainer?: HTMLElement;
  viewportWidth: number;
}) => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const animatePanelTransforms = useStateFromPublishingSubject(
    dashboardInternalApi.animatePanelTransforms$
  );
  const [expandedPanelId, focusedPanelId, panels, useMargins, viewMode] =
    useBatchedPublishingSubjects(
      dashboardApi.expandedPanelId,
      dashboardApi.focusedPanelId$,
      dashboardApi.panels$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode
    );

  // const [currentLayout, setCurrentLayout] = useState(() => {
  //   const singleRow: GridLayoutData[number] = {
  //     title: 'First row',
  //     isCollapsed: false,
  //     panels: {},
  //   };

  //   Object.keys(panels).forEach((panelId) => {
  //     const gridData = panels[panelId].gridData;
  //     singleRow.panels[panelId] = {
  //       id: panelId,
  //       row: gridData.y,
  //       column: gridData.x,
  //       width: gridData.w,
  //       height: gridData.h,
  //     };
  //   });

  //   return [singleRow] as GridLayoutData;
  // });

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

  /**
   *  Track panel maximized state delayed by one tick and use it to prevent
   * panel sliding animations on maximize and minimize.
   */
  const [delayedIsPanelExpanded, setDelayedIsPanelMaximized] = useState(false);
  useEffect(() => {
    if (expandedPanelId) {
      setDelayedIsPanelMaximized(true);
    } else {
      setTimeout(() => setDelayedIsPanelMaximized(false), 0);
    }
  }, [expandedPanelId]);

  const appFixedViewport = useAppFixedViewport();

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== ViewMode.EDIT) return;
      console.log('ON LAYOUT CHANGE', newLayout[0]);

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
      // setCurrentLayout(newLayout);
    },
    [dashboardApi, viewMode]
  );

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === ViewMode.VIEW,
    'dshLayout--editing': viewMode !== ViewMode.VIEW,
    'dshLayout--noAnimation': !animatePanelTransforms || delayedIsPanelExpanded,
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = dashboardApi.panels$.getValue();
      if (!currentPanels[id]) return;
      console.log('renderPanelContents');

      const type = currentPanels[id].type;
      return (
        <DashboardGridItem
          data-grid={currentPanels[id].gridData}
          key={id}
          id={id}
          type={type}
          setDragHandles={setDragHandles}
          expandedPanelId={expandedPanelId}
          focusedPanelId={focusedPanelId}
          appFixedViewport={appFixedViewport}
        />
      );
    },
    [expandedPanelId, focusedPanelId, appFixedViewport, dashboardApi]
  );

  const gridSettings = useMemo(() => {
    return {
      gutterSize: DASHBOARD_MARGIN_SIZE,
      rowHeight: DASHBOARD_GRID_HEIGHT,
      columnCount: DASHBOARD_GRID_COLUMN_COUNT,
    };
  }, []);

  // // in print mode, dashboard layout is not controlled by React Grid Layout
  // if (viewMode === ViewMode.PRINT) {
  //   return <>{panelComponents}</>;
  // }

  return (
    <Profiler
      id="KbnGridLayout"
      onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
        console.log('on render', {
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
        });
      }}
    >
      <div className={classes}>
        <GridLayout
          layout={currentLayout}
          gridSettings={gridSettings}
          renderPanelContents={renderPanelContents}
          onLayoutChange={onLayoutChange}
        />
      </div>
    </Profiler>
  );
};
