/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useMemo, useRef } from 'react';

import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { GridLayout, type GridLayoutData } from '@kbn/grid-layout';

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

export const DashboardGrid = ({ dashboardContainer }: { dashboardContainer?: HTMLElement }) => {
  const dashboardApi = useDashboardApi();
  const panelRefs = useRef<{ [panelId: string]: React.Ref<HTMLDivElement> }>({});

  const [expandedPanelId, panels, useMargins, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.expandedPanelId,
    dashboardApi.panels$,
    dashboardApi.settings.useMargins$,
    dashboardApi.viewMode
  );

  const appFixedViewport = useAppFixedViewport();

  const currentLayout: GridLayoutData = useMemo(() => {
    const singleRow: GridLayoutData[number] = {
      title: '', // we only support a single section currently, and it does not have a title
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

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      if (viewMode !== 'edit') return;

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
          dashboardContainer={dashboardContainer}
        />
      );
    },
    [appFixedViewport, dashboardApi, dashboardContainer]
  );

  const memoizedgridLayout = useMemo(() => {
    // memoizing this component reduces the number of times it gets re-rendered to a minimum
    return (
      <GridLayout
        layout={currentLayout}
        gridSettings={{
          gutterSize: useMargins ? DASHBOARD_MARGIN_SIZE : 0,
          rowHeight: DASHBOARD_GRID_HEIGHT,
          columnCount: DASHBOARD_GRID_COLUMN_COUNT,
        }}
        renderPanelContents={renderPanelContents}
        onLayoutChange={onLayoutChange}
        expandedPanelId={expandedPanelId}
        accessMode={viewMode === 'edit' ? 'EDIT' : 'VIEW'}
      />
    );
  }, [currentLayout, useMargins, renderPanelContents, onLayoutChange, expandedPanelId, viewMode]);

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === 'view',
    'dshLayout--editing': viewMode !== 'view',
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  return <div className={classes}>{memoizedgridLayout}</div>;
};
