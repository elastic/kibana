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
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Layout, Responsive as ResponsiveReactGridLayout } from 'react-grid-layout';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { useAppFixedViewport } from '@kbn/core-rendering-browser';
import { DashboardPanelState } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { useDashboardGridSettings } from './use_dashboard_grid_settings';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { getPanelLayoutsAreEqual } from '../../state/diffing/dashboard_diffing_utils';
import { DASHBOARD_GRID_HEIGHT, DASHBOARD_MARGIN_SIZE } from '../../../dashboard_constants';

export const DashboardGrid = ({
  dashboardContainer,
  viewportWidth,
}: {
  dashboardContainer?: HTMLElement;
  viewportWidth: number;
}) => {
  const dashboardApi = useDashboardApi();

  const [animatePanelTransforms, expandedPanelId, focusedPanelId, panels, useMargins, viewMode] =
    useBatchedPublishingSubjects(
      dashboardApi.animatePanelTransforms$,
      dashboardApi.expandedPanelId,
      dashboardApi.focusedPanelId$,
      dashboardApi.panels$,
      dashboardApi.useMargins$,
      dashboardApi.viewMode
    );

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

  const panelsInOrder: string[] = useMemo(() => {
    return Object.keys(panels).sort((embeddableIdA, embeddableIdB) => {
      const panelA = panels[embeddableIdA];
      const panelB = panels[embeddableIdB];

      // need to manually sort the panels by position because we want the panels to be collapsed from the left to the
      // right when switching to the single column layout, but RGL sorts by ID which can cause unexpected behaviour between
      // by-reference and by-value panels + we want the HTML order to align with this in the multi-panel view
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });
  }, [panels]);

  const panelComponents = useMemo(() => {
    return panelsInOrder.map((embeddableId, index) => {
      const type = panels[embeddableId].type;
      return (
        <DashboardGridItem
          appFixedViewport={appFixedViewport}
          dashboardContainer={dashboardContainer}
          data-grid={panels[embeddableId].gridData}
          key={embeddableId}
          id={embeddableId}
          index={index + 1}
          type={type}
          expandedPanelId={expandedPanelId}
          focusedPanelId={focusedPanelId}
        />
      );
    });
  }, [
    appFixedViewport,
    dashboardContainer,
    expandedPanelId,
    panels,
    panelsInOrder,
    focusedPanelId,
  ]);

  const onLayoutChange = useCallback(
    (newLayout: Array<Layout & { i: string }>) => {
      if (viewMode !== ViewMode.EDIT) return;

      const updatedPanels: { [key: string]: DashboardPanelState } = newLayout.reduce(
        (updatedPanelsAcc, panelLayout) => {
          updatedPanelsAcc[panelLayout.i] = {
            ...panels[panelLayout.i],
            gridData: pick(panelLayout, ['x', 'y', 'w', 'h', 'i']),
          };
          return updatedPanelsAcc;
        },
        {} as { [key: string]: DashboardPanelState }
      );
      console.log(updatedPanels);
      if (!getPanelLayoutsAreEqual(panels, updatedPanels)) {
        dashboardApi.setPanels(updatedPanels);
      }
    },
    [dashboardApi, panels, viewMode]
  );

  const classes = classNames({
    'dshLayout-withoutMargins': !useMargins,
    'dshLayout--viewing': viewMode === ViewMode.VIEW,
    'dshLayout--editing': viewMode !== ViewMode.VIEW,
    'dshLayout--noAnimation': !animatePanelTransforms || delayedIsPanelExpanded,
    'dshLayout-isMaximizedPanel': expandedPanelId !== undefined,
  });

  const { layouts, breakpoints, columns } = useDashboardGridSettings(panelsInOrder, panels);

  // in print mode, dashboard layout is not controlled by React Grid Layout
  if (viewMode === ViewMode.PRINT) {
    return <>{panelComponents}</>;
  }

  return (
    <ResponsiveReactGridLayout
      cols={columns}
      layouts={layouts}
      className={classes}
      width={viewportWidth}
      breakpoints={breakpoints}
      onLayoutChange={onLayoutChange}
      isResizable={!expandedPanelId && !focusedPanelId}
      isDraggable={!expandedPanelId && !focusedPanelId}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      margin={useMargins ? [DASHBOARD_MARGIN_SIZE, DASHBOARD_MARGIN_SIZE] : [0, 0]}
      draggableHandle={'.embPanel--dragHandle'}
      useCSSTransforms={false}
    >
      {panelComponents}
    </ResponsiveReactGridLayout>
  );
};
